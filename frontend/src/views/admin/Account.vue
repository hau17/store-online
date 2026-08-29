<script setup>
// Tài khoản cá nhân (admin tự sửa hồ sơ/đổi mật khẩu của chính mình) — cùng cấu trúc với
// customer/Account.vue, tách file riêng cho nhanh thay vì dùng chung 1 component (mục 6.1).
import { ref, onMounted } from 'vue';
import authService from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useToast } from '../../composables/useToast';
import BaseButton from '../../components/common/BaseButton.vue';

const authStore = useAuthStore();
const { showToast } = useToast();

const profileForm = ref({ full_name: '', phone: '', address: '' });
const profileError = ref('');
const savingProfile = ref(false);

const passwordForm = ref({ old_password: '', new_password: '', confirm_password: '' });
const passwordError = ref('');
const changingPassword = ref(false);

function loadProfileForm() {
  profileForm.value = {
    full_name: authStore.user?.full_name || '',
    phone: authStore.user?.phone || '',
    address: authStore.user?.address || '',
  };
}

async function submitProfile() {
  if (!profileForm.value.full_name.trim()) {
    profileError.value = 'Họ tên không được để trống';
    return;
  }

  savingProfile.value = true;
  profileError.value = '';
  try {
    const res = await authService.updateProfile(profileForm.value);
    authStore.updateUser(res.data.data);
    showToast('Cập nhật hồ sơ thành công');
  } catch (err) {
    profileError.value = err.response?.data?.message || 'Cập nhật hồ sơ thất bại';
  } finally {
    savingProfile.value = false;
  }
}

async function submitPassword() {
  if (passwordForm.value.new_password.length < 6) {
    passwordError.value = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    return;
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordError.value = 'Xác nhận mật khẩu mới không khớp';
    return;
  }

  changingPassword.value = true;
  passwordError.value = '';
  try {
    await authService.changePassword({
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password,
    });
    showToast('Đổi mật khẩu thành công');
    passwordForm.value = { old_password: '', new_password: '', confirm_password: '' };
  } catch (err) {
    passwordError.value = err.response?.data?.message || 'Đổi mật khẩu thất bại';
  } finally {
    changingPassword.value = false;
  }
}

onMounted(loadProfileForm);
</script>

<template>
  <div class="mx-auto max-w-lg">
    <h1>Tài khoản của tôi</h1>

    <div class="section mt-6 rounded-lg bg-surface p-5 shadow-sm">
      <h3>Thông tin cá nhân</h3>
      <div class="mt-3 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Họ tên</label>
          <input
            v-model="profileForm.full_name"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Email</label>
          <input
            :value="authStore.user?.email"
            type="email"
            disabled
            class="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-text-secondary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Số điện thoại</label>
          <input
            v-model="profileForm.phone"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Địa chỉ</label>
          <input
            v-model="profileForm.address"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <p v-if="profileError" class="text-sm text-danger">{{ profileError }}</p>
        <BaseButton class="self-start" :loading="savingProfile" @click="submitProfile">
          {{ savingProfile ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </BaseButton>
      </div>
    </div>

    <div class="section mt-5 rounded-lg bg-surface p-5 shadow-sm">
      <h3>Đổi mật khẩu</h3>
      <div class="mt-3 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Mật khẩu cũ</label>
          <input
            v-model="passwordForm.old_password"
            type="password"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Mật khẩu mới</label>
          <input
            v-model="passwordForm.new_password"
            type="password"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Xác nhận mật khẩu mới</label>
          <input
            v-model="passwordForm.confirm_password"
            type="password"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <p v-if="passwordError" class="text-sm text-danger">{{ passwordError }}</p>
        <BaseButton class="self-start" :loading="changingPassword" @click="submitPassword">
          {{ changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
