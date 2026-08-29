// Các hàm gọi API /api/categories.
import api from './api';

export default {
  // params: { keyword, page, limit }
  getCategories(params) {
    return api.get('/categories', { params });
  },
  getCategoryById(id) {
    return api.get(`/categories/${id}`);
  },
  createCategory(data) {
    return api.post('/categories', data);
  },
  updateCategory(id, data) {
    return api.put(`/categories/${id}`, data);
  },
  deleteCategory(id) {
    return api.delete(`/categories/${id}`);
  },
};
