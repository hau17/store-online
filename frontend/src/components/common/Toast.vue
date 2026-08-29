<script setup>
// Khu vực hiển thị toast — mount 1 lần duy nhất ở App.vue. Góc trên phải, tự ẩn sau ~3s (mục 10.5).
import { useToast } from '../../composables/useToast';

const { toasts, removeToast } = useToast();
</script>

<template>
  <div class="fixed right-4 top-4 z-[200] flex w-full max-w-xs flex-col gap-2">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-md"
      :class="t.type === 'danger' ? 'bg-danger' : 'bg-success'"
    >
      <span class="flex-1">{{ t.message }}</span>
      <button
        type="button"
        class="opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Đóng thông báo"
        @click="removeToast(t.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>
