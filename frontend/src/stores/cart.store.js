// Store lưu trạng thái giỏ hàng.
import { defineStore } from 'pinia';
import cartService from '../services/cart.service';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    totalAmount: 0,
  }),

  getters: {
    // Tổng SỐ LƯỢNG sách trong giỏ (khác totalAmount là tổng TIỀN) — dùng hiển thị badge trên icon giỏ hàng
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
  },

  actions: {
    async fetchCart() {
      const res = await cartService.getCart();
      this.items = res.data.data.items;
      this.totalAmount = res.data.data.total_amount;
    },

    // Các action bên dưới trả về { success, message } thay vì throw lỗi, để component gọi tự
    // quyết định hiển thị lỗi thế nào (vd vượt tồn kho) mà không cần bọc try/catch lặp lại mỗi nơi.
    async addItem(bookId, quantity) {
      try {
        await cartService.addToCart({ book_id: bookId, quantity });
        await this.fetchCart();
        return { success: true };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Thêm vào giỏ hàng thất bại' };
      }
    },

    async updateItem(bookId, quantity) {
      try {
        await cartService.updateCartItem(bookId, quantity);
        await this.fetchCart();
        return { success: true };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Cập nhật giỏ hàng thất bại' };
      }
    },

    async removeItem(bookId) {
      try {
        await cartService.removeCartItem(bookId);
        await this.fetchCart();
        return { success: true };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Xóa sách khỏi giỏ hàng thất bại' };
      }
    },

    async clear() {
      try {
        await cartService.clearCart();
        this.items = [];
        this.totalAmount = 0;
        return { success: true };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Xóa giỏ hàng thất bại' };
      }
    },

    // Reset về rỗng khi logout — KHÔNG gọi API (đăng xuất xử lý hoàn toàn client-side theo mục 6.1)
    reset() {
      this.items = [];
      this.totalAmount = 0;
    },
  },
});
