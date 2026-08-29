<script setup>
// Trang chi tiết đơn hàng đầy đủ — dùng cho cả lúc vừa checkout xong (hiện QR chờ thanh toán) lẫn
// xem lại đơn cũ bất kỳ lúc nào (từ OrderList.vue). Lắng nghe socket 'order:paid' và
// 'order:status_updated' (mục 7 trong spec) để cập nhật giao diện NGAY LẬP TỨC khi admin đổi trạng
// thái hoặc webhook xác nhận thanh toán, không cần reload hay polling.
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderStore } from '../../stores/order.store';
import orderService from '../../services/order.service';
import socket from '../../services/socket';
import { ORDER_STATUS_LABELS } from '../../utils/orderStatusFlow';
import StatusBadge from '../../components/common/StatusBadge.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';

const route = useRoute();
const orderStore = useOrderStore();

const loading = ref(true);
const errorMessage = ref('');
const justUpdated = ref(false); // bật hiệu ứng nhấp nháy nhẹ trong 2s ngay sau khi nhận realtime update
const cancelling = ref(false);
const cancelError = ref('');
const showCancelConfirm = ref(false);

async function loadOrder() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await orderStore.fetchOrderById(route.params.id);
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được thông tin đơn hàng';
  } finally {
    loading.value = false;
  }
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
  return new Date(value).toLocaleString('vi-VN');
}

// order:paid (webhook) và order:status_updated (admin đổi tay, mục 7) xử lý giống nhau: nếu đúng
// đơn đang xem thì cập nhật status ngay bằng payload nhận được, KHÔNG gọi lại API — payment_info
// (QR) tự ẩn theo vì template đã điều kiện theo status === 'pending'.
function handleStatusEvent(payload) {
  if (!orderStore.currentOrder || Number(payload.order_id) !== Number(orderStore.currentOrder.id)) return;
  orderStore.updateCurrentOrderStatus(payload.status);
  justUpdated.value = true;
  setTimeout(() => (justUpdated.value = false), 2000);
}

async function confirmCancel() {
  showCancelConfirm.value = false;
  cancelling.value = true;
  cancelError.value = '';
  try {
    await orderService.cancelOrder(route.params.id);
    await loadOrder(); // tải lại để lấy đúng status + status_history mới nhất
  } catch (err) {
    cancelError.value = err.response?.data?.message || 'Hủy đơn hàng thất bại';
  } finally {
    cancelling.value = false;
  }
}

onMounted(() => {
  loadOrder();
  socket.on('order:paid', handleStatusEvent);
  socket.on('order:status_updated', handleStatusEvent);
});

// Gỡ listener khi rời trang -> tránh nhận event trùng lặp / rò rỉ bộ nhớ nếu mở lại trang này nhiều lần.
onUnmounted(() => {
  socket.off('order:paid', handleStatusEvent);
  socket.off('order:status_updated', handleStatusEvent);
});
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-8">
    <h1>Chi tiết đơn hàng</h1>

    <p v-if="loading" class="mt-4 text-text-secondary">Đang tải...</p>
    <p v-else-if="errorMessage" class="mt-4 text-danger">{{ errorMessage }}</p>

    <div
      v-else-if="orderStore.currentOrder"
      class="mt-4 rounded-lg bg-surface p-5 shadow-sm transition-colors duration-300"
      :class="{ 'bg-[#FFF8D9]': justUpdated }"
    >
      <div class="flex items-start justify-between">
        <div>
          <p><strong>Mã đơn:</strong> {{ orderStore.currentOrder.order_code }}</p>
          <p class="text-sm text-text-secondary">Đặt lúc: {{ formatDate(orderStore.currentOrder.created_at) }}</p>
        </div>
        <StatusBadge :status="orderStore.currentOrder.status" />
      </div>

      <h3 class="mt-5">Sản phẩm</h3>
      <div class="mt-2 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-2 py-2 text-left">Sách</th>
              <th class="px-2 py-2 text-left">Số lượng</th>
              <th class="px-2 py-2 text-left">Giá</th>
              <th class="px-2 py-2 text-left">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in orderStore.currentOrder.items" :key="item.book_id" class="border-b border-border">
              <td class="px-2 py-2">{{ item.book_title }}</td>
              <td class="px-2 py-2">{{ item.quantity }}</td>
              <td class="px-2 py-2">{{ formatPrice(item.price) }}</td>
              <td class="px-2 py-2">{{ formatPrice(item.price * item.quantity) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-right">Tổng tiền: <strong class="text-accent">{{ formatPrice(orderStore.currentOrder.total_amount) }}</strong></p>

      <h3 class="mt-5">Thông tin giao hàng</h3>
      <p class="text-[15px]"><strong>Người nhận:</strong> {{ orderStore.currentOrder.shipping_name }}</p>
      <p class="text-[15px]"><strong>SĐT:</strong> {{ orderStore.currentOrder.shipping_phone }}</p>
      <p class="text-[15px]"><strong>Địa chỉ:</strong> {{ orderStore.currentOrder.shipping_address }}</p>
      <p v-if="orderStore.currentOrder.note" class="text-[15px]"><strong>Ghi chú:</strong> {{ orderStore.currentOrder.note }}</p>

      <!-- Chỉ backend trả payment_info khi bank_transfer VÀ status = pending -> không cần check thêm
           payment_method ở đây; check status === 'pending' để tự ẩn ngay khi socket báo đã paid,
           không cần đợi gọi lại API -->
      <div
        v-if="orderStore.currentOrder.payment_info && orderStore.currentOrder.status === 'pending'"
        class="mt-4 border-y border-dashed border-border py-4 text-center"
      >
        <p class="font-semibold text-warning">Đang chờ xác nhận thanh toán...</p>
        <img
          :src="orderStore.currentOrder.payment_info.qr_url"
          alt="Mã QR chuyển khoản thanh toán đơn hàng"
          class="mx-auto my-3 h-[180px] w-[180px] rounded-lg border border-border"
        />
        <p class="text-left text-[15px]">
          <strong>Ngân hàng (BIN):</strong> {{ orderStore.currentOrder.payment_info.bank_bin }} —
          <strong>STK:</strong> {{ orderStore.currentOrder.payment_info.bank_account }}
          ({{ orderStore.currentOrder.payment_info.account_name }})
        </p>
        <p class="text-left text-[15px]"><strong>Nội dung chuyển khoản:</strong> {{ orderStore.currentOrder.payment_info.transfer_content }}</p>
        <p class="text-left text-[15px]"><strong>Số tiền:</strong> {{ formatPrice(orderStore.currentOrder.payment_info.amount) }}</p>
      </div>

      <h3 class="mt-5">Lịch sử trạng thái</h3>
      <ul class="mt-2 flex flex-col gap-2">
        <li v-for="(h, index) in orderStore.currentOrder.status_history" :key="index" class="flex items-center gap-2 text-sm">
          <StatusBadge :status="h.status" />
          <span class="text-text-secondary">{{ formatDate(h.created_at) }}</span>
          <span v-if="h.note" class="text-text-secondary">— {{ h.note }}</span>
        </li>
      </ul>

      <p v-if="cancelError" class="mt-3 text-sm text-danger">{{ cancelError }}</p>
      <div class="mt-5 flex items-center gap-4">
        <button
          v-if="orderStore.currentOrder.status === 'pending'"
          type="button"
          class="min-h-[44px] rounded-lg border border-danger px-4 py-2 text-[15px] text-danger hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="cancelling"
          @click="showCancelConfirm = true"
        >
          {{ cancelling ? 'Đang hủy...' : 'Hủy đơn' }}
        </button>
        <router-link to="/orders" class="text-primary hover:underline">Đơn hàng của tôi</router-link>
      </div>
    </div>

    <ConfirmDialog
      :show="showCancelConfirm"
      title="Hủy đơn hàng"
      message="Bạn chắc chắn muốn hủy đơn hàng này?"
      confirm-label="Hủy đơn"
      @confirm="confirmCancel"
      @cancel="showCancelConfirm = false"
    />
  </div>
</template>
