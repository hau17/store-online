const pool = require('../config/db');
const env = require('../config/env');
const cartItemModel = require('../models/cartItem.model');
const orderModel = require('../models/order.model');
const orderItemModel = require('../models/orderItem.model');
const orderStatusHistoryModel = require('../models/orderStatusHistory.model');
const paymentModel = require('../models/payment.model');
const bookModel = require('../models/book.model');
const generateOrderCode = require('../utils/generateOrderCode');
const generateVietQrUrl = require('../utils/generateVietQrUrl');
const { emitToUser } = require('../sockets/orderSocket');
const { success, error } = require('../utils/response');

// Business rule #6: trạng thái đơn hàng chỉ đi 1 chiều, không nhảy cóc/quay lui (trừ cancelled).
// Key = trạng thái hiện tại, value = mảng trạng thái được phép chuyển tới. Dùng map thay vì
// if-else lồng nhau để thêm/sửa luồng chuyển trạng thái sau này chỉ cần sửa đúng 1 chỗ.
const VALID_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipping'],
  shipping: ['completed', 'delivery_failed'],
  completed: [],
  cancelled: [],
  delivery_failed: [],
};

function validateShippingInput({ shipping_name, shipping_phone, shipping_address }) {
  if (!shipping_name || !shipping_name.trim()) return 'Vui lòng nhập tên người nhận';
  if (!shipping_phone || !/^[0-9]{9,11}$/.test(shipping_phone.trim())) {
    return 'Số điện thoại không hợp lệ (9-11 chữ số)';
  }
  if (!shipping_address || !shipping_address.trim()) return 'Vui lòng nhập địa chỉ giao hàng';
  return null;
}

// payment_info chỉ có ý nghĩa khi bank_transfer VÀ đơn còn đang "pending" (đã paid/cancelled thì
// không cần hiển thị QR nữa) — build lại được từ chính dữ liệu đơn hàng (order_code, total_amount)
// + cấu hình VietQR trong .env, nên dùng chung được cho cả response lúc tạo đơn (createOrder) lẫn
// lúc xem lại đơn sau này (getOrderById, kể cả sau khi F5 trang).
function buildPaymentInfo(order) {
  if (order.payment_method !== 'bank_transfer' || order.status !== 'pending') return undefined;
  return {
    bank_account: env.VIETQR_ACCOUNT_NUMBER,
    bank_bin: env.VIETQR_BANK_BIN,
    account_name: env.VIETQR_ACCOUNT_NAME,
    amount: order.total_amount,
    transfer_content: order.order_code,
    qr_url: generateVietQrUrl({ amount: order.total_amount, addInfo: order.order_code }),
  };
}

function assertCanViewOrder(req, order) {
  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    const err = new Error('Bạn không có quyền xem đơn hàng này');
    err.statusCode = 403;
    err.errorCode = 'FORBIDDEN';
    throw err;
  }
}

// POST /api/orders — checkout, ĐÚNG 9 BƯỚC transaction trong spec mục 6.7
async function createOrder(req, res, next) {
  try {
    const { shipping_name, shipping_phone, shipping_address, payment_method, note } = req.body;

    const validationError = validateShippingInput({ shipping_name, shipping_phone, shipping_address });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const method = payment_method === 'cod' ? 'cod' : 'bank_transfer'; // mặc định bank_transfer đúng spec

    let orderId;
    let orderCode;
    let totalAmount;

    // Toàn bộ 9 bước a-i dưới đây PHẢI cùng thành công hoặc cùng thất bại (business rule #4) —
    // đây là luồng rủi ro nhất trong toàn hệ thống. Nếu lỗi giữa chừng mà không rollback sạch,
    // có thể xảy ra: giỏ hàng bị xóa nhưng đơn không được tạo (khách mất trắng giỏ hàng vô cớ),
    // hoặc đơn được tạo nhưng thiếu order_items/payments (đơn "mồ côi" không thể xử lý tiếp).
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // a. Lấy giỏ hàng của user — đọc bằng chính connection của transaction này
      const cartItems = await cartItemModel.findByUserId(req.user.id, conn);
      if (cartItems.length === 0) {
        const err = new Error('Giỏ hàng đang trống');
        err.statusCode = 400;
        err.errorCode = 'CART_EMPTY';
        throw err;
      }

      // b. Kiểm tra tồn kho từng sách còn đủ không so với số lượng trong giỏ
      for (const item of cartItems) {
        if (item.quantity > item.stock_quantity) {
          const err = new Error(
            `Sách "${item.title}" chỉ còn ${item.stock_quantity} cuốn, không đủ số lượng trong giỏ hàng (${item.quantity})`
          );
          err.statusCode = 400;
          err.errorCode = 'OUT_OF_STOCK';
          throw err;
        }
      }

      // c. Tính tổng tiền
      totalAmount = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

      // d. Sinh order_code duy nhất (xem giải thích race condition trong generateImportCode.js)
      orderCode = await generateOrderCode(conn);

      // e. Insert đơn hàng — status mặc định 'pending' theo default của cột trong DB
      orderId = await orderModel.create(
        {
          order_code: orderCode,
          user_id: req.user.id,
          total_amount: totalAmount,
          payment_method: method,
          shipping_name: shipping_name.trim(),
          shipping_phone: shipping_phone.trim(),
          shipping_address: shipping_address.trim(),
          note,
        },
        conn
      );

      // f. Insert chi tiết đơn hàng — snapshot book_title + price NGAY LÚC NÀY (business rule #2),
      // không lưu tham chiếu để join giá hiện tại của books về sau (giá sách có thể đổi sau này).
      const orderItemsData = cartItems.map((item) => ({
        book_id: item.book_id,
        book_title: item.title,
        quantity: item.quantity,
        price: item.price,
      }));
      await orderItemModel.createMany(orderId, orderItemsData, conn);

      // g. Ghi lịch sử trạng thái đầu tiên
      await orderStatusHistoryModel.create(
        { order_id: orderId, status: 'pending', changed_by: 'system', note: 'Đơn hàng vừa được tạo' },
        conn
      );

      // h. Xóa giỏ hàng — chỉ xóa SAU khi mọi bước ghi trên đã qua, để nếu có bước nào lỗi thì
      // giỏ hàng vẫn còn nguyên sau rollback (khách không bị mất giỏ oan uổng).
      await cartItemModel.clearCart(req.user.id, conn);

      // i. Nếu thanh toán chuyển khoản: tạo dòng payment ban đầu (status 'pending' theo default DB)
      if (method === 'bank_transfer') {
        await paymentModel.create(
          { order_id: orderId, amount: totalAmount, gateway: 'sepay', transfer_content: orderCode },
          conn
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return success(res, {
      message: 'Tạo đơn hàng thành công',
      statusCode: 201,
      data: {
        order_id: orderId,
        order_code: orderCode,
        total_amount: totalAmount,
        status: 'pending',
        payment_info: buildPaymentInfo({
          payment_method: method,
          status: 'pending',
          total_amount: totalAmount,
          order_code: orderCode,
        }),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders — đơn của user hiện tại, hoặc TẤT CẢ nếu admin + ?all=true
async function getOrders(req, res, next) {
  try {
    const all = req.query.all === 'true';
    const { status, from_date, to_date, keyword } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { items, total } = await orderModel.findByUserId(req.user.id, {
      all,
      isAdmin: req.user.role === 'admin',
      status,
      from_date,
      to_date,
      keyword,
      page,
      limit,
    });

    return success(res, {
      message: 'Lấy danh sách đơn hàng thành công',
      data: { items, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id — chi tiết đơn kèm order_items, chỉ chủ đơn hoặc admin được xem
async function getOrderById(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return error(res, { message: 'Không tìm thấy đơn hàng', errorCode: 'ORDER_NOT_FOUND', statusCode: 404 });
    }
    assertCanViewOrder(req, order);

    const items = await orderItemModel.findByOrderId(req.params.id);
    return success(res, {
      message: 'Lấy chi tiết đơn hàng thành công',
      data: { ...order, items, payment_info: buildPaymentInfo(order) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id/status — dùng cho FE polling dự phòng nếu socket lỗi kết nối
async function getOrderStatus(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return error(res, { message: 'Không tìm thấy đơn hàng', errorCode: 'ORDER_NOT_FOUND', statusCode: 404 });
    }
    assertCanViewOrder(req, order);

    return success(res, { message: 'OK', data: { status: order.status } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/status — Admin only
async function updateOrderStatus(req, res, next) {
  try {
    const { status: newStatus, note } = req.body;

    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return error(res, { message: 'Không tìm thấy đơn hàng', errorCode: 'ORDER_NOT_FOUND', statusCode: 404 });
    }

    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(newStatus)) {
      return error(res, {
        message: `Không thể chuyển trạng thái từ "${order.status}" sang "${newStatus}". Trạng thái hợp lệ tiếp theo: ${
          allowedNext.length ? allowedNext.join(', ') : '(không có, đây là trạng thái kết thúc)'
        }`,
        errorCode: 'INVALID_STATUS_TRANSITION',
        statusCode: 400,
      });
    }

    if (newStatus === 'delivery_failed') {
      // Lý do bắt buộc phải có — đây là thông tin quan trọng cần lưu lại khi hoàn kho, không được
      // để trống (business rule liên quan tới hoàn kho, mục 6.7).
      if (!note || !note.trim()) {
        return error(res, {
          message: 'Vui lòng nhập lý do khi chuyển đơn sang "Giao không thành công"',
          errorCode: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }

      // delivery_failed là trường hợp ĐẶC BIỆT DUY NHẤT ngoài webhook được phép hoàn lại
      // stock_quantity (business rule #3) — phải bọc trong TRANSACTION RIÊNG (business rule #4)
      // vì vừa đổi status đơn vừa cộng tồn kho nhiều dòng sách cùng lúc: nếu lỗi giữa chừng mà
      // không rollback sạch, có thể xảy ra tồn kho được hoàn nhưng đơn không đổi trạng thái
      // (hoặc ngược lại), gây lệch số liệu tồn kho thật không thể tự sửa lại.
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // a. Đổi trạng thái đơn
        await orderModel.updateStatus(req.params.id, 'delivery_failed', conn);

        // b + c. Lấy từng dòng sách trong đơn, hoàn lại đúng số lượng đã trừ lúc chuyển "paid"
        const orderItems = await orderItemModel.findByOrderId(req.params.id);
        for (const item of orderItems) {
          await bookModel.increaseStock(item.book_id, item.quantity, conn);
        }

        // d + e. Ghi lịch sử kèm lý do bắt buộc
        await orderStatusHistoryModel.create(
          { order_id: req.params.id, status: 'delivery_failed', changed_by: 'admin', note },
          conn
        );

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      // Các trường hợp chuyển trạng thái KHÁC delivery_failed: giữ nguyên logic cũ — chỉ update
      // status + insert history, KHÔNG đụng tới stock_quantity.
      await orderModel.updateStatus(req.params.id, newStatus);
      await orderStatusHistoryModel.create({ order_id: req.params.id, status: newStatus, changed_by: 'admin', note });
    }

    // f. Báo realtime cho đúng khách hàng sở hữu đơn (mục 7) — trang OrderStatus.vue nếu đang mở
    // sẽ tự cập nhật giao diện ngay bằng payload này, không cần reload hay polling lại API.
    const io = req.app.get('io');
    emitToUser(io, order.user_id, 'order:status_updated', { order_id: Number(req.params.id), status: newStatus });

    return success(res, { message: 'Cập nhật trạng thái đơn hàng thành công', data: { status: newStatus } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/orders/:id — khách tự hủy đơn, CHỈ khi đang ở trạng thái pending
async function cancelOrder(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return error(res, { message: 'Không tìm thấy đơn hàng', errorCode: 'ORDER_NOT_FOUND', statusCode: 404 });
    }
    assertCanViewOrder(req, order);

    if (order.status !== 'pending') {
      return error(res, {
        message: 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái chờ xử lý',
        errorCode: 'CANNOT_CANCEL',
        statusCode: 400,
      });
    }

    await orderModel.updateStatus(req.params.id, 'cancelled');
    // changed_by chỉ nhận 'system'/'admin' theo ENUM trong schema (không có 'customer') — khách tự
    // hủy đơn của chính mình được ghi nhận là 'system', admin hủy hộ thì ghi 'admin'.
    await orderStatusHistoryModel.create({
      order_id: req.params.id,
      status: 'cancelled',
      changed_by: req.user.role === 'admin' ? 'admin' : 'system',
      note: 'Khách hàng tự hủy đơn',
    });

    return success(res, { message: 'Hủy đơn hàng thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getOrders, getOrderById, getOrderStatus, updateOrderStatus, cancelOrder };
