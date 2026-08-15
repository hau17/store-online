// Các hàm gọi API /api/authors.
import api from './api';

export default {
  getAuthors(params) {
    return api.get('/authors', { params });
  },
  getAuthorById(id) {
    return api.get(`/authors/${id}`);
  },
  createAuthor(data) {
    return api.post('/authors', data);
  },
  updateAuthor(id, data) {
    return api.put(`/authors/${id}`, data);
  },
  deleteAuthor(id) {
    return api.delete(`/authors/${id}`);
  },
};
