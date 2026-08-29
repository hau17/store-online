<script setup>
// Khung trang cho khu vực khách hàng (mục 10.6): header cố định (logo trái, tìm kiếm giữa, giỏ
// hàng + user menu phải) + nội dung + footer đơn giản. Nếu người dùng hiện tại là admin (nhưng
// đang ghé trang khách, vd trang chủ) thì vẫn hiện đúng menu điều hướng dành cho admin.
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useCartStore } from '../stores/cart.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const cartStore = useCartStore();

const searchKeyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '');

function submitSearch() {
  router.push({ path: '/', query: searchKeyword.value ? { keyword: searchKeyword.value } : {} });
}

function handleLogout() {
  authStore.logout();
  router.push('/');
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-50 border-b border-border bg-surface">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 md:flex-nowrap">
        <router-link to="/" class="font-display text-xl font-semibold text-primary shrink-0">
          Bookstore
        </router-link>

        <form class="order-3 w-full md:order-none md:flex-1" @submit.prevent="submitSearch">
          <label for="header-search" class="sr-only">Tìm kiếm sách</label>
          <input
            id="header-search"
            v-model="searchKeyword"
            type="search"
            placeholder="Tìm theo tên sách, tác giả..."
            class="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </form>

        <nav class="flex shrink-0 items-center gap-4 text-[15px]">
          <template v-if="authStore.isLoggedIn">
            <template v-if="authStore.isAdmin">
              <router-link to="/admin" class="text-text-primary hover:text-primary">Trang quản trị</router-link>
              <router-link to="/admin/account" class="text-text-primary hover:text-primary">Tài khoản của tôi</router-link>
            </template>
            <template v-else>
              <router-link to="/account" class="text-text-primary hover:text-primary">Tài khoản của tôi</router-link>
              <router-link to="/orders" class="text-text-primary hover:text-primary">Đơn hàng của tôi</router-link>
              <router-link
                to="/cart"
                class="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-primary hover:text-primary"
                aria-label="Giỏ hàng"
              >
                🛒
                <span
                  v-if="cartStore.itemCount > 0"
                  class="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                >
                  {{ cartStore.itemCount }}
                </span>
              </router-link>
            </template>
            <span class="hidden text-sm text-text-secondary lg:inline">{{ authStore.user?.full_name }}</span>
            <button
              type="button"
              class="min-h-[36px] rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              @click="handleLogout"
            >
              Đăng xuất
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="text-text-primary hover:text-primary">Đăng nhập</router-link>
            <router-link to="/register" class="text-text-primary hover:text-primary">Đăng ký</router-link>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border bg-surface py-6 text-sm text-text-secondary">
      <div class="mx-auto max-w-6xl px-4 text-center">
        <p>Bookstore — Hiệu sách trực tuyến. Liên hệ: hotro@bookstore.vn — 1900 1234</p>
      </div>
    </footer>
  </div>
</template>
