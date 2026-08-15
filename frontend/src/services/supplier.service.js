// Các hàm gọi API /api/suppliers. Toàn bộ route yêu cầu admin (kể cả GET).
import api from './api';

export default {
  getSuppliers() {
    return api.get('/suppliers');
  },
  getSupplierById(id) {
    return api.get(`/suppliers/${id}`);
  },
  createSupplier(data) {
    return api.post('/suppliers', data);
  },
  updateSupplier(id, data) {
    return api.put(`/suppliers/${id}`, data);
  },
  deleteSupplier(id) {
    return api.delete(`/suppliers/${id}`);
  },
};
