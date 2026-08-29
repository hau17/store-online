// Các hàm gọi API /api/publishers.
import api from './api';

export default {
  // params: { keyword, page, limit }
  getPublishers(params) {
    return api.get('/publishers', { params });
  },
  getPublisherById(id) {
    return api.get(`/publishers/${id}`);
  },
  createPublisher(data) {
    return api.post('/publishers', data);
  },
  updatePublisher(id, data) {
    return api.put(`/publishers/${id}`, data);
  },
  deletePublisher(id) {
    return api.delete(`/publishers/${id}`);
  },
};
