// Các hàm gọi API /api/orders. Toàn bộ route yêu cầu đăng nhập (interceptor trong api.js tự gắn token).
import api from './api';

export default {
  createOrder(data) {
    return api.post('/orders', data);
  },
  // params: { all, page, limit }
  getOrders(params) {
    return api.get('/orders', { params });
  },
  getOrderById(id) {
    return api.get(`/orders/${id}`);
  },
  getOrderStatus(id) {
    return api.get(`/orders/${id}/status`);
  },
  // data: { status, note } — Admin only (route đã gắn admin.middleware ở backend)
  updateOrderStatus(id, data) {
    return api.put(`/orders/${id}/status`, data);
  },
  cancelOrder(id) {
    return api.delete(`/orders/${id}`);
  },
};
