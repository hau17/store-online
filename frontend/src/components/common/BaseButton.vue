<script setup>
// Button dùng chung cho toàn app — style theo mục 10.5 trong spec.
// variant: 'primary' (accent, hành động chính) | 'secondary' (viền, hành động phụ) | 'danger' (nguy hiểm)
import { computed } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' }, // 'sm' | 'md'
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(['click']);

const isDisabled = computed(() => props.loading || props.disabled);

const variantClass = computed(() => ({
  primary: 'bg-accent text-white hover:bg-[#a3781f]',
  secondary: 'bg-surface text-text-primary border border-border hover:bg-background',
  danger: 'bg-danger text-white hover:bg-[#a52828]',
}[props.variant]));

const sizeClass = computed(() => ({
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-[15px]',
}[props.size]));
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    class="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    :class="[variantClass, sizeClass]"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <slot />
  </button>
</template>
