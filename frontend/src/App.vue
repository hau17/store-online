<script setup>
// App root: nav bar chung (đổi theo trạng thái đăng nhập) + <RouterView /> render đúng view theo route.
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  // Đang ở khu vực admin thì về trang login (vì rời khỏi đó không còn quyền vào nữa),
  // còn lại thì về trang chủ cho khách hàng bình thường.
  if (route.path.startsWith('/admin')) {
    router.push('/login');
  } else {
    router.push('/');
  }
}
</script>

<template>
  <header class="navbar">
    <router-link to="/" class="brand">Bookstore</router-link>

    <nav class="nav-links">
      <template v-if="authStore.isLoggedIn">
        <router-link v-if="authStore.isAdmin" to="/admin">Trang quản trị</router-link>
        <router-link v-else to="/cart">Giỏ hàng</router-link>
        <span class="user-name">{{ authStore.user?.full_name }}</span>
        <button class="logout-btn" @click="handleLogout">Đăng xuất</button>
      </template>
      <template v-else>
        <router-link to="/login">Đăng nhập</router-link>
        <router-link to="/register">Đăng ký</router-link>
      </template>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid #ddd;
}
.brand {
  font-weight: bold;
  font-size: 18px;
  text-decoration: none;
  color: #222;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav-links a {
  text-decoration: none;
  color: #222;
}
.user-name {
  color: #666;
  font-size: 14px;
}
.logout-btn {
  padding: 6px 12px;
  cursor: pointer;
}
</style>
