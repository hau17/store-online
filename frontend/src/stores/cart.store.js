// Store lưu trạng thái giỏ hàng. Action (fetchCart, addItem...) sẽ code ở bước sau.
import { defineStore } from 'pinia';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    totalAmount: 0,
  }),
});
