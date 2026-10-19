// Bảng chuyển trạng thái đơn theo payment_method (spec mục 6.7). PHẢI GIỐNG HỆT
// frontend/src/utils/orderStatusFlow.js — sửa 1 bên nhớ sửa bên kia cho khớp.
// COD không đi qua "paid": admin xác nhận đơn COD bằng cách chuyển thẳng pending -> processing.
const VALID_TRANSITIONS = {
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

// Đơn ở các trạng thái này đã bị trừ kho (đã đi qua bước xác nhận đơn) — spec mục 6.7.1.
const STOCK_DEDUCTED_STATUSES = ['paid', 'processing', 'shipping', 'completed'];

function getNextStatuses(paymentMethod, currentStatus) {
  return VALID_TRANSITIONS[paymentMethod]?.[currentStatus] || [];
}

// Bước xác nhận đơn: pending -> paid (chuyển khoản) hoặc pending -> processing (COD) -> trừ kho.
function isConfirmTransition(currentStatus, nextStatus) {
  return currentStatus === 'pending' && (nextStatus === 'paid' || nextStatus === 'processing');
}

// Đơn đã trừ kho bị hủy hoặc giao không thành công -> hoàn kho.
function isRestockTransition(currentStatus, nextStatus) {
  return (
    STOCK_DEDUCTED_STATUSES.includes(currentStatus) && (nextStatus === 'cancelled' || nextStatus === 'delivery_failed')
  );
}

module.exports = {
  VALID_TRANSITIONS,
  STOCK_DEDUCTED_STATUSES,
  getNextStatuses,
  isConfirmTransition,
  isRestockTransition,
};
