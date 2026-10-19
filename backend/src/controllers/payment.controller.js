const env = require("../config/env");
const orderModel = require("../models/order.model");
const orderItemModel = require("../models/orderItem.model");
const orderStatusHistoryModel = require("../models/orderStatusHistory.model");
const paymentModel = require("../models/payment.model");
const bookModel = require("../models/book.model");
const { withTransaction } = require("../utils/transaction");
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

    const found = await orderModel.findByOrderCode(orderCode);
    if (!found) {
      console.warn(
        `[SePay webhook] Không tìm thấy đơn hàng với order_code=${orderCode}, cần đối chiếu thủ công.`,
      );
      return success(res, { message: "Không tìm thấy đơn hàng tương ứng" });
    }

    // d-f. Toàn bộ xử lý trong 1 transaction có khóa dòng đơn hàng (findByIdForUpdate), để webhook
    // gọi trùng / admin thao tác cùng lúc không xử lý 1 đơn 2 lần (business rule #4).
    const outcome = await withTransaction(async (conn) => {
      const order = await orderModel.findByIdForUpdate(found.id, conn);

      // d. Đơn phải còn "pending" mới xử lý tiếp
      if (order.status !== "pending") {
        if (order.status === "cancelled") {
          console.warn(
            `[SePay webhook] Nhận tiền cho đơn ĐÃ HỦY ${orderCode} — cần hoàn tiền thủ công. referenceCode=${referenceCode}, số tiền=${transferAmount}`,
          );
        } else {
          console.warn(
            `[SePay webhook] Đơn ${orderCode} đang ở trạng thái "${order.status}" (không phải pending). Bỏ qua.`,
          );
        }
        return { result: "not_pending" };
      }

      const payment = await paymentModel.findByOrderId(order.id, conn);

      // Webhook gọi lặp sau khi đã ghi nhận tiền (vd lần trước thiếu hàng nên đơn vẫn pending)
      if (payment?.status === "success") {
        console.warn(`[SePay webhook] Đơn ${orderCode} đã ghi nhận thanh toán trước đó. Bỏ qua.`);
        return { result: "already_recorded" };
      }

      // e. So khớp số tiền — total_amount (DECIMAL) mysql2 trả về STRING, transferAmount là number
      // -> phải Number() cả 2 vế, so sánh === trực tiếp giữa string và number luôn false.
      const transferAmountNum = Number(transferAmount);
      const totalAmountNum = Number(order.total_amount);
      if (transferAmountNum !== totalAmountNum) {
        if (payment) {
          await paymentModel.updateStatus(payment.id, { status: "failed", raw_payload: req.body }, conn);
        }
        console.warn(
          `[SePay webhook] Lệch số tiền — đơn ${orderCode} yêu cầu ${totalAmountNum} nhưng nhận được ${transferAmountNum}, cần admin đối chiếu thủ công.`,
        );
        return { result: "amount_mismatch" };
      }

      // f. Khớp tiền: tiền đã thực sự về tài khoản nên LUÔN ghi nhận payment success, kể cả khi
      // thiếu hàng. deductStockForOrder ném INSUFFICIENT_STOCK trước khi trừ dòng nào, nên bắt lỗi
      // đó ở đây là đủ (không có gì cần rollback).
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

      const orderItems = await orderItemModel.findByOrderId(order.id, conn);
      try {
        await bookModel.deductStockForOrder(orderItems, conn);
      } catch (stockErr) {
        if (stockErr.errorCode !== "INSUFFICIENT_STOCK") throw stockErr;

        const missing = stockErr.shortages.map((s) => `"${s.title}" (còn ${s.available}/${s.required})`).join(", ");
        await orderStatusHistoryModel.create(
          {
            order_id: order.id,
            status: "pending",
            changed_by: "system",
            note: `Đã nhận đủ tiền nhưng thiếu hàng: ${missing}`.slice(0, 255),
          },
          conn,
        );
        console.warn(
          `[SePay webhook] Đơn ${orderCode} đã nhận đủ tiền nhưng thiếu hàng (${missing}) — giữ pending chờ admin xử lý.`,
        );
        return { result: "insufficient_stock" };
      }

      await orderModel.updateStatus(order.id, "paid", conn);
      await orderStatusHistoryModel.create(
        {
          order_id: order.id,
          status: "paid",
          changed_by: "system",
          note: "Xác nhận qua SePay webhook",
        },
        conn,
      );

      return { result: "paid", order };
    });

    if (outcome.result !== "paid") {
      const messages = {
        not_pending: "Đơn hàng không ở trạng thái chờ thanh toán",
        already_recorded: "Thanh toán đã được ghi nhận trước đó",
        amount_mismatch: "Số tiền chuyển khoản không khớp, cần đối chiếu thủ công",
        insufficient_stock: "Đã ghi nhận thanh toán, đơn chờ bổ sung hàng",
      };
      return success(res, { message: messages[outcome.result] });
    }

    // g. Báo realtime cho đúng khách hàng sở hữu đơn (mục 7), chỉ sau khi đã commit
    const io = req.app.get("io");
    emitToUser(io, outcome.order.user_id, "order:paid", {
      order_id: outcome.order.id,
      order_code: outcome.order.order_code,
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
