<script setup>
// Trang đăng nhập: form đơn giản, validate cơ bản phía client rồi gọi authStore.login().
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

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
  <div class="auth-page">
    <h1>Đăng nhập</h1>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" placeholder="you@example.com" />
      </div>

      <div class="form-group">
        <label for="password">Mật khẩu</label>
        <input id="password" v-model="password" type="password" placeholder="Mật khẩu" />
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
      </button>
    </form>

    <p>
      Chưa có tài khoản?
      <router-link to="/register">Đăng ký</router-link>
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
