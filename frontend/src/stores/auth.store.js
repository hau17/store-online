// Store lưu trạng thái đăng nhập: user hiện tại + JWT token.
import { defineStore } from 'pinia';
import authService from '../services/auth.service';

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
    },

    // Gọi GET /api/auth/me để khôi phục thông tin user khi F5 lại trang (đã có token nhưng state.user rỗng)
    async fetchMe() {
      if (!this.token) return;
      try {
        const res = await authService.getMe();
        this.user = res.data.data;
      } catch (err) {
        // Token hết hạn/không hợp lệ -> coi như đã đăng xuất
        this.logout();
      }
    },
  },
});
