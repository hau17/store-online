// Map trạng thái hợp lệ tiếp theo — PHẢI GIỐNG HỆT VALID_TRANSITIONS trong
// backend/src/controllers/order.controller.js (business rule #6). Dùng chung ở FE để không hiển
// thị lựa chọn nào rồi bị backend từ chối. Sửa 1 bên nhớ sửa bên kia cho khớp.
export const ORDER_STATUS_FLOW = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipping'],
  shipping: ['completed', 'delivery_failed'],
  completed: [],
  cancelled: [],
  delivery_failed: [],
};

export const ORDER_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  processing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  delivery_failed: 'Giao không thành công',
};
