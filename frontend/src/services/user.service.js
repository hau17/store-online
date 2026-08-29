// Các hàm gọi API /api/users — admin quản lý khách hàng (mục 6.11).
import api from './api';

export default {
  // params: { keyword, status, page, limit }
  getCustomers(params) {
    return api.get('/users', { params });
  },
  getCustomerById(id) {
    return api.get(`/users/${id}`);
  },
  lockCustomer(id, reason) {
    return api.put(`/users/${id}/lock`, { reason });
  },
  unlockCustomer(id) {
    return api.put(`/users/${id}/unlock`);
  },
};
