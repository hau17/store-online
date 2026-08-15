import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth.store'

const app = createApp(App)

app.use(createPinia())

// Nếu đã có token lưu sẵn (từ lần đăng nhập trước) -> gọi /api/auth/me để khôi phục
// thông tin user vào store TRƯỚC khi mount, để router guard (chặn /admin/*) có đủ dữ liệu
// ngay từ lần điều hướng đầu tiên, tránh trường hợp F5 trang admin bị đá nhầm ra login.
const authStore = useAuthStore()
authStore.fetchMe().finally(() => {
  app.use(router)
  app.mount('#app')
})
