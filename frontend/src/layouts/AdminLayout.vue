<script setup>
// Khung trang cho khu vực admin (mục 10.6): sidebar trái nhóm theo cụm Sản phẩm/Kho/Đơn hàng/
// Người dùng + topbar (tên admin + đăng xuất) + nội dung chính bên phải. Dưới breakpoint md,
// sidebar thu gọn thành menu hamburger (mục 10.7).
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();
const sidebarOpen = ref(false);

const NAV_GROUPS = [
  {
    label: 'Sản phẩm',
    items: [
      { to: '/admin/books', label: 'Sách' },
      { to: '/admin/categories', label: 'Danh mục' },
      { to: '/admin/authors', label: 'Tác giả' },
      { to: '/admin/publishers', label: 'Nhà xuất bản' },
    ],
  },
  {
    label: 'Kho',
    items: [
      { to: '/admin/suppliers', label: 'Nhà cung cấp' },
      { to: '/admin/stock-imports', label: 'Nhập hàng' },
    ],
  },
  {
    label: 'Đơn hàng',
    items: [{ to: '/admin/orders', label: 'Quản lý đơn hàng' }],
  },
  {
    label: 'Người dùng',
    items: [{ to: '/admin/customers', label: 'Khách hàng' }],
  },
];

function closeSidebar() {
  sidebarOpen.value = false;
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Overlay mờ phía sau sidebar khi mở trên mobile -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/40 md:hidden"
      @click="closeSidebar"
    ></div>

    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 -translate-x-full border-r border-border bg-primary text-white transition-transform duration-200 md:static md:translate-x-0"
      :class="{ 'translate-x-0': sidebarOpen }"
    >
      <div class="flex h-full flex-col overflow-y-auto px-4 py-5">
        <router-link to="/admin" class="mb-6 block font-display text-xl font-semibold text-white" @click="closeSidebar">
          Bookstore Admin
        </router-link>

        <router-link
          to="/admin"
          class="mb-4 block min-h-[44px] rounded-lg px-3 py-2 text-[15px] leading-[28px] hover:bg-primary-light"
          @click="closeSidebar"
        >
          Tổng quan
        </router-link>

        <nav v-for="group in NAV_GROUPS" :key="group.label" class="mb-5">
          <p class="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-white/60">{{ group.label }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="block min-h-[44px] rounded-lg px-3 py-2 text-[15px] leading-[28px] hover:bg-primary-light"
            active-class="bg-primary-light font-medium"
            @click="closeSidebar"
          >
            {{ item.label }}
          </router-link>
        </nav>
      </div>
    </aside>

    <div class="flex min-h-screen flex-1 flex-col md:pl-0">
      <header class="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <button
          type="button"
          class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-primary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-label="Mở menu quản trị"
          @click="sidebarOpen = !sidebarOpen"
        >
          ☰
        </button>
        <div class="flex-1"></div>
        <router-link to="/admin/account" class="text-sm text-text-primary hover:text-primary">
          {{ authStore.user?.full_name }}
        </router-link>
        <button
          type="button"
          class="min-h-[36px] rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @click="handleLogout"
        >
          Đăng xuất
        </button>
      </header>

      <main class="flex-1 bg-background px-4 py-6">
        <slot />
      </main>
    </div>
  </div>
</template>
