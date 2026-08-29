const pool = require("../config/db");
const env = require("../config/env");
const orderModel = require("../models/order.model");
const orderItemModel = require("../models/orderItem.model");
const orderStatusHistoryModel = require("../models/orderStatusHistory.model");
const paymentModel = require("../models/payment.model");
const bookModel = require("../models/book.model");
const { emitToUser } = require("../sockets/orderSocket");
const { success, error } = require("../utils/response");

// Khớp format order_code: DH + 11 chữ số (vd DH20260814001)
const ORDER_CODE_REGEX = /DH\d{11}/;

// POST /api/webhook/sepay — SePay gọi trực tiếp mỗi khi có giao dịch chuyển khoản vào tài khoản
// đã đăng ký. Đây là điểm NHẠY CẢM NHẤT hệ thống — xử lý sai có thể làm lệch tiền/tồn kho thật,
// nên toàn bộ các bước a-h dưới đây bám sát ĐÚNG THỨ TỰ trong spec mục 6.8, không gộp/rút gọn.
async function handleSepayWebhook(req, res, next) {
  try {
    // a. Verify secret TRƯỚC TIÊN. Sai thì từ chối ngay và KHÔNG log payload — tránh lộ dữ liệu
    // giao dịch thật nếu có ai đó dò quét endpoint này bằng secret sai.
    const authHeader = req.headers.authorization || "";

    // Hỗ trợ cả 'Bearer <token>', 'Apikey <token>' hoặc truyền token trực tiếp
    let token = null;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (authHeader.startsWith("Apikey ")) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }

    if (token !== env.SEPAY_WEBHOOK_SECRET) {
      return error(res, {
        message: "Sai secret xác thực webhook",
        errorCode: "INVALID_WEBHOOK_SECRET",
        statusCode: 401,
      });
    }
    const { transferType, content, transferAmount, referenceCode } = req.body;

    // b. Không phải giao dịch tiền VÀO -> không quan tâm, vẫn trả 200 để SePay không retry lại.
    if (transferType !== "in") {
      return success(res, { message: "Bỏ qua giao dịch không phải tiền vào" });
    }

    // c. Tìm order_code trong content bằng regex. Không thấy -> log toàn bộ payload để admin tự
    // đối chiếu thủ công, vẫn trả 200 (SePay không cần biết mình xử lý được hay không).
    const match = (content || "").match(ORDER_CODE_REGEX);
    if (!match) {
      console.warn(
        "[SePay webhook] Không tìm thấy mã đơn hợp lệ trong nội dung chuyển khoản, cần đối chiếu thủ công. Payload:",
        req.body,
      );
      return success(res, {
        message: "Không tìm thấy mã đơn trong nội dung chuyển khoản",
      });
    }
    const orderCode = match[0];

    // d. Tìm order theo order_code — phải tồn tại VÀ đang "pending" mới xử lý tiếp (đơn đã paid rồi
    // thì bỏ qua, tránh trừ tồn kho 2 lần nếu SePay lỡ gọi webhook trùng).
    const order = await orderModel.findByOrderCode(orderCode);
    if (!order) {
      console.warn(
        `[SePay webhook] Không tìm thấy đơn hàng với order_code=${orderCode}, cần đối chiếu thủ công.`,
      );
      return success(res, { message: "Không tìm thấy đơn hàng tương ứng" });
    }
    if (order.status !== "pending") {
      console.warn(
        `[SePay webhook] Đơn ${orderCode} đang ở trạng thái "${order.status}" (không phải pending) — có thể đã xử lý rồi hoặc không còn chờ thanh toán. Bỏ qua.`,
      );
      return success(res, {
        message: "Đơn hàng không ở trạng thái chờ thanh toán",
      });
    }

    const payment = await paymentModel.findByOrderId(order.id);

    // e. So khớp số tiền — total_amount là cột DECIMAL, mysql2 trả về dạng STRING, còn transferAmount
    // từ JSON body là number -> phải Number() cả 2 vế trước khi so sánh, so sánh trực tiếp === giữa
    // string và number sẽ LUÔN false dù giá trị thực chất bằng nhau.
    const transferAmountNum = Number(transferAmount);
    const totalAmountNum = Number(order.total_amount);
    if (transferAmountNum !== totalAmountNum) {
      if (payment) {
        await paymentModel.updateStatus(payment.id, {
          status: "failed",
          raw_payload: req.body,
        });
      }
      console.warn(
        `[SePay webhook] Lệch số tiền — đơn ${orderCode} yêu cầu ${totalAmountNum} nhưng nhận được ${transferAmountNum}, cần admin đối chiếu thủ công.`,
      );
      return success(res, {
        message: "Số tiền chuyển khoản không khớp, cần đối chiếu thủ công",
      });
    }

    // f. Khớp tiền -> xác nhận thanh toán. TOÀN BỘ BƯỚC DƯỚI ĐÂY BỌC TRONG 1 TRANSACTION (business
    // rule #4): đổi status đơn + payment + trừ tồn kho + ghi lịch sử phải cùng thành công hoặc cùng
    // thất bại — nếu không rollback sạch, có thể xảy ra tình huống đơn đã "paid" (coi như đã nhận
    // tiền) nhưng tồn kho không trừ, hoặc ngược lại, gây lệch dữ liệu thật không thể tự sửa lại.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await orderModel.updateStatus(order.id, "paid", conn);

      if (payment) {
        await paymentModel.updateStatus(
          payment.id,
          {
            status: "success",
            paid_at: new Date(),
            gateway_transaction_id: referenceCode,
            transfer_content: content,
            raw_payload: req.body,
          },
          conn,
        );
      }

      const orderItems = await orderItemModel.findByOrderId(order.id);
      for (const item of orderItems) {
        await bookModel.decreaseStock(item.book_id, item.quantity, conn);
      }

      await orderStatusHistoryModel.create(
        {
          order_id: order.id,
          status: "paid",
          changed_by: "system",
          note: "Xác nhận qua SePay webhook",
        },
        conn,
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // g. Báo realtime cho đúng khách hàng sở hữu đơn (mục 7) — trang OrderStatus.vue nếu đang mở
    // sẽ tự đổi giao diện ngay, không cần reload hay polling lại API.
    const io = req.app.get("io");
    emitToUser(io, order.user_id, "order:paid", {
      order_id: order.id,
      order_code: order.order_code,
      status: "paid",
    });

    // h. Luôn trả 200 khi đã xác thực secret hợp lệ, tránh SePay retry vô ích.
    return success(res, { message: "Xác nhận thanh toán thành công" });
  } catch (err) {
    // Lỗi bất ngờ (DB lỗi, v.v.) VẪN trả 200 sau khi log lại — không để SePay retry vô hạn vì lỗi
    // phía server mình (đã qua bước xác thực secret hợp lệ ở (a) rồi, không phải lỗi từ SePay).
    console.error("[SePay webhook] Lỗi xử lý ngoài dự kiến:", err);
    return success(res, {
      message:
        "Đã nhận webhook, có lỗi xử lý phía server (đã log lại để kiểm tra)",
    });
  }
}

module.exports = { handleSepayWebhook };
