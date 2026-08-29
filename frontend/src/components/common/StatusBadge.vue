<script setup>
// Badge trạng thái dùng chung cho MỌI nơi hiển thị trạng thái đơn hàng + trạng thái tài khoản
// (OrderList, OrderStatus, OrderManage, CustomerManage...). Đây là nơi DUY NHẤT quản lý màu/nhãn
// badge (đúng bảng 10.2 trong spec) — sau này thêm trạng thái mới chỉ cần sửa STATUS_MAP bên dưới,
// không cần sửa rải rác ở từng trang.
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, required: true },
});

const STATUS_MAP = {
  pending: { bg: '#FEF3C7', textClass: 'text-warning', label: 'Chờ xử lý' },
  paid: { bg: '#DBEAFE', textClass: 'text-info', label: 'Đã thanh toán' },
  processing: { bg: '#E0E7FF', textClass: 'text-primary', label: 'Đang chuẩn bị' },
  shipping: { bg: '#FEF0D6', textClass: 'text-accent', label: 'Đang giao' },
  completed: { bg: '#D1FAE5', textClass: 'text-success', label: 'Hoàn thành' },
  cancelled: { bg: '#FEE2E2', textClass: 'text-danger', label: 'Đã hủy' },
  delivery_failed: { bg: '#FDEBD8', textClass: 'text-danger-alt', label: 'Giao không thành công' },
  active: { bg: '#D1FAE5', textClass: 'text-success', label: 'Đang hoạt động' },
  locked: { bg: '#FEE2E2', textClass: 'text-danger', label: 'Đã khóa' },
};

const info = computed(() => STATUS_MAP[props.status] || { bg: '#E5E3DD', textClass: 'text-text-secondary', label: props.status });
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="info.textClass"
    :style="{ backgroundColor: info.bg }"
  >
    {{ info.label }}
  </span>
</template>
