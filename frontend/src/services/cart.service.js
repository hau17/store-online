// Các hàm gọi API /api/cart. Toàn bộ route yêu cầu đăng nhập (interceptor trong api.js tự gắn token).
import api from './api';

export default {
  getCart() {
    return api.get('/cart');
  },
  addToCart(data) {
    return api.post('/cart', data);
  },
  updateCartItem(bookId, quantity) {
    return api.put(`/cart/${bookId}`, { quantity });
  },
  removeCartItem(bookId) {
    return api.delete(`/cart/${bookId}`);
  },
  clearCart() {
    return api.delete('/cart');
  },
};
