// Các hàm gọi API /api/books.
import api from './api';

export default {
  // params: { keyword, category_id, page, limit, sort }
  getBooks(params) {
    return api.get('/books', { params });
  },
  getBookById(id) {
    return api.get(`/books/${id}`);
  },
  createBook(data) {
    return api.post('/books', data);
  },
  updateBook(id, data) {
    return api.put(`/books/${id}`, data);
  },
  deleteBook(id) {
    return api.delete(`/books/${id}`);
  },

  // formData: instance của FormData, đã append field "images" (1 hoặc nhiều file).
  // KHÔNG set header Content-Type thủ công — trình duyệt/axios tự thêm
  // "multipart/form-data; boundary=..." đúng chuẩn khi thấy body là FormData,
  // set tay dễ bị thiếu boundary khiến backend (multer) không parse được.
  uploadBookImages(bookId, formData) {
    return api.post(`/books/${bookId}/images`, formData);
  },
  deleteBookImage(bookId, imageId) {
    return api.delete(`/books/${bookId}/images/${imageId}`);
  },
  setPrimaryImage(bookId, imageId) {
    return api.put(`/books/${bookId}/images/${imageId}/primary`);
  },
};
