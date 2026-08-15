<script setup>
// Trang đăng ký: validate cơ bản phía client (khớp rule backend) rồi gọi authStore.register().
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

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
  <div class="auth-page">
    <h1>Đăng ký</h1>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="fullName">Họ tên</label>
        <input id="fullName" v-model="fullName" type="text" placeholder="Nguyễn Văn A" />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" placeholder="you@example.com" />
      </div>

      <div class="form-group">
        <label for="password">Mật khẩu</label>
        <input id="password" v-model="password" type="password" placeholder="Tối thiểu 6 ký tự" />
      </div>

      <div class="form-group">
        <label for="phone">Số điện thoại (không bắt buộc)</label>
        <input id="phone" v-model="phone" type="text" placeholder="0900000000" />
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Đang đăng ký...' : 'Đăng ký' }}
      </button>
    </form>

    <p>
      Đã có tài khoản?
      <router-link to="/login">Đăng nhập</router-link>
    </p>
  </div>
</template>

<style scoped>
.auth-page {
  max-width: 360px;
  margin: 40px auto;
  padding: 0 16px;
}
.form-group {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
input {
  padding: 8px;
  font-size: 14px;
}
button {
  width: 100%;
  padding: 8px;
  cursor: pointer;
}
.error {
  color: #d33;
  font-size: 14px;
}
</style>
