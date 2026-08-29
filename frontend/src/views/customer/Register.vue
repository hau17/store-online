<script setup>
// Trang đăng ký: validate cơ bản phía client (khớp rule backend) rồi gọi authStore.register().
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import BaseButton from '../../components/common/BaseButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const fullName = ref('');
const email = ref('');
const password = ref('');
const phone = ref('');
const errorMessage = ref('');
const loading = ref(false);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate() {
  if (!fullName.value.trim()) return 'Họ tên không được để trống';
  if (!EMAIL_REGEX.test(email.value)) return 'Email không hợp lệ';
  if (password.value.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return '';
}

async function handleSubmit() {
  errorMessage.value = '';

  const validationError = validate();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  loading.value = true;
  try {
    await authStore.register({
      full_name: fullName.value,
      email: email.value,
      password: password.value,
      phone: phone.value || undefined,
    });
    router.push('/'); // đăng ký thành công -> về trang chủ
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-12">
    <h1 class="text-center">Đăng ký</h1>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-1">
        <label for="fullName" class="text-sm font-medium text-text-primary">Họ tên</label>
        <input
          id="fullName"
          v-model="fullName"
          type="text"
          placeholder="Nguyễn Văn A"
          class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

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
          placeholder="Tối thiểu 6 ký tự"
          class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="phone" class="text-sm font-medium text-text-primary">Số điện thoại (không bắt buộc)</label>
        <input
          id="phone"
          v-model="phone"
          type="text"
          placeholder="0900000000"
          class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-danger">{{ errorMessage }}</p>

      <BaseButton type="submit" class="w-full" :loading="loading">
        {{ loading ? 'Đang đăng ký...' : 'Đăng ký' }}
      </BaseButton>
    </form>

    <p class="mt-4 text-center text-sm text-text-secondary">
      Đã có tài khoản?
      <router-link to="/login" class="text-primary hover:underline">Đăng nhập</router-link>
    </p>
  </div>
</template>
