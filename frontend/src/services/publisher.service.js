// Các hàm gọi API /api/publishers.
import api from './api';

export default {
  getPublishers() {
    return api.get('/publishers');
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
