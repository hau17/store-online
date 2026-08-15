<script setup>
// Trang tổng quan admin: chỉ làm nơi điều hướng nhanh tới các trang quản trị, chưa cần thống kê số liệu.
</script>

<template>
  <div class="dashboard">
    <h1>Admin Dashboard</h1>
    <nav class="admin-nav">
      <router-link to="/admin/categories">Quản lý danh mục</router-link>
      <router-link to="/admin/authors">Quản lý tác giả</router-link>
      <router-link to="/admin/publishers">Quản lý nhà xuất bản</router-link>
      <router-link to="/admin/books">Quản lý sách</router-link>
      <router-link to="/admin/suppliers">Quản lý nhà cung cấp</router-link>
      <router-link to="/admin/stock-imports">Quản lý nhập hàng</router-link>
      <router-link to="/admin/orders">Quản lý đơn hàng</router-link>
    </nav>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}
.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
.admin-nav a {
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-decoration: none;
  color: #222;
}
.admin-nav a:hover {
  background: #f5f5f5;
}
</style>
