<script setup>
// Trang đăng nhập: form đơn giản, validate cơ bản phía client rồi gọi authStore.login().
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import BaseButton from '../../components/common/BaseButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

async function handleSubmit() {
  errorMessage.value = '';

  // Validate cơ bản phía client — chỉ để UX tốt hơn (báo lỗi sớm),
  // validate "thật" vẫn nằm ở backend vì client luôn có thể bị qua mặt.
  if (!email.value || !password.value) {
    errorMessage.value = 'Vui lòng nhập đầy đủ email và mật khẩu';
    return;
  }

  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    router.push('/'); // đăng nhập thành công -> về trang chủ
  } catch (err) {
    // Lỗi từ API luôn có dạng { success:false, message, error_code } -> lấy message hiển thị cho user
    errorMessage.value = err.response?.data?.message || 'Đăng nhập thất bại, vui lòng thử lại';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-12">
    <h1 class="text-center">Đăng nhập</h1>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-1">
        <label for="email" class="text-sm font-medium text-text-primary">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="you@example.com"
          class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="password" class="text-sm font-medium text-text-primary">Mật khẩu</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Mật khẩu"
          class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-danger">{{ errorMessage }}</p>

      <BaseButton type="submit" class="w-full" :loading="loading">
        {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
      </BaseButton>
    </form>

    <p class="mt-4 text-center text-sm text-text-secondary">
      Chưa có tài khoản?
      <router-link to="/register" class="text-primary hover:underline">Đăng ký</router-link>
    </p>
  </div>
</template>
