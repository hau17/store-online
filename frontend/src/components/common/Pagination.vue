<script setup>
// Phân trang dùng chung cho mọi trang danh sách (Home, OrderList, và toàn bộ *Manage.vue phía
// admin) — style theo "Button phụ" ở mục 10.5.
defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
});

const emit = defineEmits(['change-page']);
</script>

<template>
  <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-3">
    <button
      type="button"
      class="min-h-[44px] rounded-lg border border-border bg-surface px-4 py-2 text-[15px] text-text-primary transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="currentPage <= 1"
      @click="emit('change-page', currentPage - 1)"
    >
      Trước
    </button>
    <span class="text-sm text-text-secondary">Trang {{ currentPage }} / {{ totalPages }}</span>
    <button
      type="button"
      class="min-h-[44px] rounded-lg border border-border bg-surface px-4 py-2 text-[15px] text-text-primary transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="currentPage >= totalPages"
      @click="emit('change-page', currentPage + 1)"
    >
      Sau
    </button>
  </div>
</template>
