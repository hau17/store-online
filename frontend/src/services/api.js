// Tạo 1 instance axios dùng chung cho cả app, trỏ tới backend.
// Interceptor tự động gắn JWT token (nếu có trong localStorage) vào header Authorization.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
