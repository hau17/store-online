<script setup>
// Trạng thái rỗng dùng chung: giỏ hàng trống, danh sách rỗng, tìm kiếm không ra kết quả...
// Giọng điệu trung tính (không xin lỗi) + luôn có 1 hành động gợi ý (đúng mục 10.5).
defineProps({
  icon: { type: String, default: '📚' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
});
defineEmits(['action']);
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-12 text-center">
    <span class="text-4xl" aria-hidden="true">{{ icon }}</span>
    <h3 class="font-display text-lg font-semibold text-text-primary">{{ title }}</h3>
    <p v-if="description" class="max-w-sm text-sm text-text-secondary">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="mt-2 min-h-[36px] rounded-lg bg-accent px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-[#a3781f] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
