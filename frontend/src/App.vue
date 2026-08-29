<script setup>
// App root: chọn layout theo route (admin -> AdminLayout, còn lại -> CustomerLayout) rồi render
// <RouterView /> bên trong. Toast mount 1 lần duy nhất ở đây để gọi được từ bất kỳ trang nào.
import { useRoute } from 'vue-router';
import CustomerLayout from './layouts/CustomerLayout.vue';
import AdminLayout from './layouts/AdminLayout.vue';
import Toast from './components/common/Toast.vue';

const route = useRoute();
</script>

<template>
  <component :is="route.meta.requiresAdmin ? AdminLayout : CustomerLayout">
    <RouterView />
  </component>
  <Toast />
</template>
