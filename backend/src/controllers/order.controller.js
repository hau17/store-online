const env = require('../config/env');
const cartItemModel = require('../models/cartItem.model');
const orderModel = require('../models/order.model');
const orderItemModel = require('../models/orderItem.model');
const orderStatusHistoryModel = require('../models/orderStatusHistory.model');
const paymentModel = require('../models/payment.model');
const bookModel = require('../models/book.model');
const generateOrderCode = require('../utils/generateOrderCode');
const generateVietQrUrl = require('../utils/generateVietQrUrl');
const { withTransaction, retryOnDuplicateCode } = require('../utils/transaction');
const { getNextStatuses, isConfirmTransition, isRestockTransition } = require('../utils/orderStatusFlow');
const { emitToUser } = require('../sockets/orderSocket');
const { success, error } = require('../utils/response');

function validateShippingInput({ shipping_name, shipping_phone, shipping_address }) {
  if (!shipping_name || !shipping_name.trim()) return 'Vui lòng nhập tên người nhận';
  if (!shipping_phone || !/^[0-9]{9,11}$/.test(shipping_phone.trim())) {
    return 'Số điện thoại không hợp lệ (9-11 chữ số)';
  }
  if (!shipping_address || !shipping_address.trim()) return 'Vui lòng nhập địa chỉ giao hàng';
  return null;
}

function httpError(statusCode, errorCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
}

// payment_info chỉ có ý nghĩa khi bank_transfer, đơn còn "pending" VÀ chưa nhận tiền — nếu webhook
// đã ghi nhận tiền (payment success, đơn còn pending vì thiếu hàng) thì ẩn QR để khách không chuyển
// lần hai. Build lại được từ dữ liệu đơn + cấu hình VietQR nên dùng chung cho createOrder/getOrderById.
function buildPaymentInfo(order) {
  if (order.payment_method !== 'bank_transfer' || order.status !== 'pending') return undefined;
  if (order.payment?.status === 'success') return undefined;
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
    throw httpError(403, 'FORBIDDEN', 'Bạn không có quyền xem đơn hàng này');
  }
}

// POST /api/orders — checkout (spec mục 6.7). Toàn bộ các bước a-i cùng thành công hoặc cùng rollback
// (business rule #4): không để giỏ bị xóa mà đơn không được tạo, hay đơn thiếu order_items/payments.
// Trùng order_code (2 request đồng thời) -> chạy lại cả transaction, tối đa 3 lần.
async function createOrder(req, res, next) {
  try {
    const { shipping_name, shipping_phone, shipping_address, payment_method, note } = req.body;

    const validationError = validateShippingInput({ shipping_name, shipping_phone, shipping_address });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const method = payment_method === 'cod' ? 'cod' : 'bank_transfer';

    const { orderId, orderCode, totalAmount } = await retryOnDuplicateCode(
      () =>
        withTransaction(async (conn) => {
          // a. Giỏ hàng đọc bằng connection của transaction
          const cartItems = await cartItemModel.findByUserId(req.user.id, conn);
          if (cartItems.length === 0) throw httpError(400, 'CART_EMPTY', 'Giỏ hàng đang trống');

          // b. Chỉ KIỂM TRA tồn kho, chưa trừ — trừ thật khi đơn được xác nhận (mục 6.7.1)
          for (const item of cartItems) {
            if (item.quantity > item.stock_quantity) {
              throw httpError(
                400,
                'OUT_OF_STOCK',
                `Sách "${item.title}" chỉ còn ${item.stock_quantity} cuốn, không đủ số lượng trong giỏ hàng (${item.quantity})`
              );
            }
          }

          // c. Tổng tiền
          const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

          // d. Mã đơn
          const code = await generateOrderCode(conn);

          // e. Đơn hàng (status mặc định 'pending')
          const id = await orderModel.create(
            {
              order_code: code,
              user_id: req.user.id,
              total_amount: total,
              payment_method: method,
              shipping_name: shipping_name.trim(),
              shipping_phone: shipping_phone.trim(),
              shipping_address: shipping_address.trim(),
              note,
            },
            conn
          );

          // f. Chi tiết đơn — snapshot book_title + price (business rule #2)
          await orderItemModel.createMany(
            id,
            cartItems.map((item) => ({
              book_id: item.book_id,
              book_title: item.title,
              quantity: item.quantity,
              price: item.price,
            })),
            conn
          );

          // g. Lịch sử trạng thái đầu tiên
          await orderStatusHistoryModel.create(
            { order_id: id, status: 'pending', changed_by: 'system', note: 'Đơn hàng vừa được tạo' },
            conn
          );

          // h. Xóa giỏ — sau mọi bước ghi ở trên để rollback thì giỏ vẫn còn nguyên
          await cartItemModel.clearCart(req.user.id, conn);

          // i. Chuyển khoản: tạo payment chờ thanh toán
          if (method === 'bank_transfer') {
            await paymentModel.create(
              { order_id: id, amount: total, gateway: 'sepay', transfer_content: code },
              conn
            );
          }

          return { orderId: id, orderCode: code, totalAmount: total };
        }),
      {
        uniqueKey: 'order_code',
        errorCode: 'ORDER_CODE_CONFLICT',
        message: 'Hệ thống đang bận, vui lòng thử lại',
      }
    );

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

// PUT /api/orders/:id/status — Admin only (spec mục 6.7, 6.7.1).
// Mọi bước chuyển chạy trong 1 transaction có khóa dòng đơn hàng: kiểm tra bước chuyển hợp lệ theo
// payment_method, trừ kho khi xác nhận đơn, hoàn kho khi đơn đã trừ kho bị hủy / giao không thành
// công, đồng bộ payments, ghi lịch sử. Socket chỉ phát sau khi commit.
async function updateOrderStatus(req, res, next) {
  try {
    const { status: newStatus } = req.body;
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';

    const order = await withTransaction(async (conn) => {
      const current = await orderModel.findByIdForUpdate(req.params.id, conn);
      if (!current) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');

      const allowedNext = getNextStatuses(current.payment_method, current.status);
      if (!allowedNext.includes(newStatus)) {
        throw httpError(
          400,
          'INVALID_STATUS_TRANSITION',
          `Không thể chuyển trạng thái từ "${current.status}" sang "${newStatus}". Trạng thái hợp lệ tiếp theo: ${
            allowedNext.length ? allowedNext.join(', ') : '(không có, đây là trạng thái kết thúc)'
          }`
        );
      }

      const payment = await paymentModel.findByOrderId(current.id, conn);
      const isConfirm = isConfirmTransition(current.status, newStatus);
      const isRestock = isRestockTransition(current.status, newStatus);
      const isCancelPaidPending =
        current.status === 'pending' && newStatus === 'cancelled' && payment?.status === 'success';

      if (!note) {
        if (isRestock) {
          throw httpError(400, 'VALIDATION_ERROR', 'Vui lòng nhập lý do khi hủy đơn đã xác nhận hoặc giao không thành công');
        }
        if (newStatus === 'paid') {
          throw httpError(400, 'VALIDATION_ERROR', 'Vui lòng ghi chú kết quả đối soát (vd mã giao dịch) khi xác nhận thanh toán thủ công');
        }
        if (isCancelPaidPending) {
          throw httpError(400, 'VALIDATION_ERROR', 'Đơn đã nhận tiền — vui lòng ghi chú việc hoàn tiền cho khách khi hủy');
        }
      }

      await orderModel.updateStatus(current.id, newStatus, conn);

      if (isConfirm || isRestock) {
        const items = await orderItemModel.findByOrderId(current.id, conn);
        if (isConfirm) await bookModel.deductStockForOrder(items, conn);
        else await bookModel.restoreStockForOrder(items, conn);
      }

      if (newStatus === 'paid' && payment && payment.status !== 'success') {
        await paymentModel.updateStatus(payment.id, { status: 'success', paid_at: new Date() }, conn);
      }
      if (current.status === 'pending' && newStatus === 'cancelled') {
        await paymentModel.cancelOpenByOrderId(current.id, conn);
      }

      await orderStatusHistoryModel.create(
        { order_id: current.id, status: newStatus, changed_by: 'admin', note: note || null },
        conn
      );

      return current;
    });

    const io = req.app.get('io');
    emitToUser(io, order.user_id, 'order:status_updated', { order_id: order.id, status: newStatus });

    return success(res, { message: 'Cập nhật trạng thái đơn hàng thành công', data: { status: newStatus } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/orders/:id — khách tự hủy đơn của mình khi còn "pending" và chưa nhận tiền.
// (Admin hủy đơn qua PUT /api/orders/:id/status để đi đúng luồng hoàn kho/ghi chú.)
async function cancelOrder(req, res, next) {
  try {
    const order = await withTransaction(async (conn) => {
      const current = await orderModel.findByIdForUpdate(req.params.id, conn);
      if (!current) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
      assertCanViewOrder(req, current);

      if (current.status !== 'pending') {
        throw httpError(400, 'CANNOT_CANCEL', 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái chờ xử lý');
      }

      const payment = await paymentModel.findByOrderId(current.id, conn);
      if (payment?.status === 'success') {
        throw httpError(
          400,
          'PAYMENT_RECEIVED',
          'Đơn đã nhận thanh toán, vui lòng liên hệ cửa hàng để được hỗ trợ hoàn tiền'
        );
      }

      await orderModel.updateStatus(current.id, 'cancelled', conn);
      await paymentModel.cancelOpenByOrderId(current.id, conn);
      await orderStatusHistoryModel.create(
        {
          order_id: current.id,
          status: 'cancelled',
          changed_by: req.user.role === 'admin' ? 'admin' : 'customer',
          note: req.user.role === 'admin' ? 'Admin hủy đơn' : 'Khách hàng tự hủy đơn',
        },
        conn
      );

      return current;
    });

    const io = req.app.get('io');
    emitToUser(io, order.user_id, 'order:status_updated', { order_id: order.id, status: 'cancelled' });

    return success(res, { message: 'Hủy đơn hàng thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getOrders, getOrderById, getOrderStatus, updateOrderStatus, cancelOrder };
