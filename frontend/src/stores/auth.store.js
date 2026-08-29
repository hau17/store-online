// Store lưu trạng thái đăng nhập: user hiện tại + JWT token.
import { defineStore } from 'pinia';
import authService from '../services/auth.service';
import { useCartStore } from './cart.store';
import socket from '../services/socket';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // { id, full_name, role, ... }
    token: localStorage.getItem('token') || null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    // Gọi API login -> lưu token vào localStorage (để F5 không mất đăng nhập) + set state.
    // Không try/catch ở đây: để lỗi (401, 403...) văng ra ngoài cho component gọi tự bắt và hiển thị.
    async login(email, password) {
      const res = await authService.login({ email, password });
      const { token, user } = res.data.data;
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      this._syncAfterLogin();
    },

    async register(data) {
      const res = await authService.register(data);
      return res.data.data;
    },

    // Xóa hết dấu vết đăng nhập, dùng khi bấm nút Đăng xuất
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      useCartStore().reset();
    },

    // Gọi GET /api/auth/me để khôi phục thông tin user khi F5 lại trang (đã có token nhưng state.user rỗng)
    async fetchMe() {
      if (!this.token) return;
      try {
        const res = await authService.getMe();
        this.user = res.data.data;
        this._syncAfterLogin();
      } catch (err) {
        // Token hết hạn/không hợp lệ -> coi như đã đăng xuất
        this.logout();
      }
    },

    // Đồng bộ lại state.user sau khi Account.vue cập nhật hồ sơ thành công — để tên hiển thị ở
    // header/navbar đổi theo ngay, không cần F5 lại trang hay gọi lại /auth/me.
    updateUser(user) {
      this.user = user;
    },

    // Giỏ hàng gắn với user -> tải lại để đồng bộ (mục 6.6); join room riêng theo user_id để nhận
    // socket event realtime (mục 7). Dùng chung cho cả login() (vừa đăng nhập) lẫn fetchMe() (F5
    // lại trang khi đã có token sẵn) — thiếu 1 trong 2 chỗ gọi thì sau khi F5, giỏ hàng/socket sẽ
    // không tự khôi phục cho tới khi user đăng xuất rồi đăng nhập lại.
    // Không await fetchCart(): lỗi tải giỏ hàng không được phép làm hỏng luồng đăng nhập.
    _syncAfterLogin() {
      socket.emit('join', this.user.id);
      useCartStore()
        .fetchCart()
        .catch((err) => console.error('Không tải được giỏ hàng:', err));
    },
  },
});
