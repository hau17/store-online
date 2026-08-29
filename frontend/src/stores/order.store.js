// Store lưu đơn hàng đang xem (currentOrder) — dùng cho trang chờ thanh toán OrderStatus.vue.
import { defineStore } from 'pinia';
import orderService from '../services/order.service';

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null,
  }),

  actions: {
    // Trả về { success, data/message } để Checkout.vue tự quyết định điều hướng/hiển thị lỗi
    // (không throw, khác với fetchOrderById bên dưới) — vì lỗi checkout luôn cần hiển thị ngay
    // trên form, không phải tình huống "để lỗi văng ra ngoài" như các action đọc dữ liệu thông thường.
    async checkout(data) {
      try {
        const res = await orderService.createOrder(data);
        this.currentOrder = res.data.data;
        return { success: true, data: res.data.data };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Đặt hàng thất bại' };
      }
    },

    async fetchOrderById(id) {
      const res = await orderService.getOrderById(id);
      this.currentOrder = res.data.data;
      return res.data.data;
    },

    // Cập nhật status của currentOrder tại chỗ khi nhận socket event realtime — không cần gọi lại API.
    updateCurrentOrderStatus(status) {
      if (this.currentOrder) this.currentOrder.status = status;
    },
  },
});
