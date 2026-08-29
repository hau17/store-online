// Các hàm gọi API /api/auth. Chỉ lo việc gọi HTTP, không chứa state — state do auth.store.js quản lý.
import api from './api';

export default {
  register(data) {
    return api.post('/auth/register', data);
  },
  login(data) {
    return api.post('/auth/login', data);
  },
  getMe() {
    return api.get('/auth/me');
  },
  updateProfile(data) {
    return api.put('/auth/me', data);
  },
  changePassword(data) {
    return api.put('/auth/change-password', data);
  },
};
