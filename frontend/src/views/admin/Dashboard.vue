<script setup>
// Trang tổng quan admin: vài card thống kê cơ bản (đếm từ pagination.total của các API đã có sẵn,
// không tạo API thống kê riêng vì spec chưa yêu cầu). Điều hướng chi tiết dùng sidebar (AdminLayout.vue).
import { ref, onMounted } from 'vue';
import bookService from '../../services/book.service';
import orderService from '../../services/order.service';
import userService from '../../services/user.service';

const stats = ref({ books: null, orders: null, customers: null });

async function loadStats() {
  const [booksRes, ordersRes, customersRes] = await Promise.allSettled([
    bookService.getBooks({ page: 1, limit: 1 }),
    orderService.getOrders({ all: true, page: 1, limit: 1 }),
    userService.getCustomers({ page: 1, limit: 1 }),
  ]);
  if (booksRes.status === 'fulfilled') stats.value.books = booksRes.value.data.data.pagination.total;
  if (ordersRes.status === 'fulfilled') stats.value.orders = ordersRes.value.data.data.pagination.total;
  if (customersRes.status === 'fulfilled') stats.value.customers = customersRes.value.data.data.pagination.total;
}

onMounted(loadStats);
</script>

<template>
  <div>
    <h1>Tổng quan</h1>

    <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-lg bg-surface p-5 shadow-sm">
        <p class="text-sm text-text-secondary">Tổng số sách</p>
        <p class="mt-1 font-display text-2xl font-semibold text-primary">{{ stats.books ?? '—' }}</p>
      </div>
      <div class="rounded-lg bg-surface p-5 shadow-sm">
        <p class="text-sm text-text-secondary">Tổng số đơn hàng</p>
        <p class="mt-1 font-display text-2xl font-semibold text-primary">{{ stats.orders ?? '—' }}</p>
      </div>
      <div class="rounded-lg bg-surface p-5 shadow-sm">
        <p class="text-sm text-text-secondary">Tổng số khách hàng</p>
        <p class="mt-1 font-display text-2xl font-semibold text-primary">{{ stats.customers ?? '—' }}</p>
      </div>
    </div>
  </div>
</template>
