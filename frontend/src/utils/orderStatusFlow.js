// Bảng chuyển trạng thái theo payment_method — PHẢI GIỐNG HỆT backend/src/utils/orderStatusFlow.js
// (business rule #6). Dùng chung ở FE để không hiển thị lựa chọn nào rồi bị backend từ chối.
// Sửa 1 bên nhớ sửa bên kia cho khớp. COD không đi qua "paid": xác nhận đơn COD = pending -> processing.
export const ORDER_STATUS_FLOW = {
  bank_transfer: {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipping', 'cancelled'],
    shipping: ['completed', 'delivery_failed'],
    completed: [],
    cancelled: [],
    delivery_failed: [],
  },
  cod: {
    pending: ['processing', 'cancelled'],
    processing: ['shipping', 'cancelled'],
    shipping: ['completed', 'delivery_failed'],
    completed: [],
    cancelled: [],
    delivery_failed: [],
  },
};

export const STOCK_DEDUCTED_STATUSES = ['paid', 'processing', 'shipping', 'completed'];

export const ORDER_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  processing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  delivery_failed: 'Giao không thành công',
};

export function getNextStatuses(paymentMethod, currentStatus) {
  return ORDER_STATUS_FLOW[paymentMethod]?.[currentStatus] || [];
}

export function isConfirmTransition(currentStatus, nextStatus) {
  return currentStatus === 'pending' && (nextStatus === 'paid' || nextStatus === 'processing');
}

export function isRestockTransition(currentStatus, nextStatus) {
  return (
    STOCK_DEDUCTED_STATUSES.includes(currentStatus) && (nextStatus === 'cancelled' || nextStatus === 'delivery_failed')
  );
}
