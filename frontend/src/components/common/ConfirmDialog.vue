<script setup>
// Modal xác nhận dùng chung trước MỌI hành động nguy hiểm (xóa, khóa tài khoản...) — đúng yêu cầu
// "LUÔN kèm confirm dialog" ở mục 10.5. Cách dùng: trang cha giữ 1 ref { show, title, message,
// onConfirm } rồi render <ConfirmDialog v-bind="confirmState" @confirm="..." @cancel="..." />.
import BaseButton from './BaseButton.vue';

defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Xác nhận' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Xác nhận' },
  cancelLabel: { type: String, default: 'Hủy' },
});
defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
    @click.self="$emit('cancel')"
  >
    <div class="w-full max-w-sm rounded-lg bg-surface p-6 shadow-md">
      <h3 class="mb-2">{{ title }}</h3>
      <p class="text-[15px] text-text-secondary">{{ message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <BaseButton variant="secondary" @click="$emit('cancel')">{{ cancelLabel }}</BaseButton>
        <BaseButton variant="danger" @click="$emit('confirm')">{{ confirmLabel }}</BaseButton>
      </div>
    </div>
  </div>
</template>
