// Store lưu trạng thái đơn hàng hiện tại. Action (fetchOrders, checkout...) sẽ code ở bước sau.
import { defineStore } from 'pinia';

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null,
  }),
});
