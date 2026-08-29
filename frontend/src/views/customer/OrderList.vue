<script setup>
// "Đơn hàng của tôi" — backend tự lọc theo user hiện tại (không truyền all). Có filter theo
// trạng thái, khoảng ngày, và tìm theo mã đơn (mục 6.7).
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import orderService from '../../services/order.service';
import { ORDER_STATUS_LABELS } from '../../utils/orderStatusFlow';
import Pagination from '../../components/common/Pagination.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import EmptyState from '../../components/common/EmptyState.vue';

const router = useRouter();

const orders = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

const filterStatus = ref('');
const filterFromDate = ref('');
const filterToDate = ref('');
const filterKeyword = ref('');
let debounceTimer = null;

async function fetchOrders(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await orderService.getOrders({
      status: filterStatus.value || undefined,
      from_date: filterFromDate.value || undefined,
      to_date: filterToDate.value || undefined,
      keyword: filterKeyword.value || undefined,
      page,
      limit: 10,
    });
    orders.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách đơn hàng';
  } finally {
    loading.value = false;
  }
}

// Mọi lần đổi filter đều quay về trang 1 (kết quả filter mới không còn liên quan gì tới trang đang xem)
function onFilterChange() {
  fetchOrders(1);
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchOrders(1), 400);
}

function goToPage(page) {
  fetchOrders(page);
}

function goToDetail(order) {
  router.push(`/orders/${order.id}`);
}

function goHome() {
  router.push('/');
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
  return new Date(value).toLocaleString('vi-VN');
}

onMounted(() => fetchOrders(1));
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <h1>Đơn hàng của tôi</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <select
        v-model="filterStatus"
        class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @change="onFilterChange"
      >
        <option value="">Tất cả trạng thái</option>
        <option v-for="(label, key) in ORDER_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        Từ ngày
        <input
          v-model="filterFromDate"
          type="date"
          class="min-h-[44px] rounded-lg border border-border px-2 py-1 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @change="onFilterChange"
        />
      </label>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        Đến ngày
        <input
          v-model="filterToDate"
          type="date"
          class="min-h-[44px] rounded-lg border border-border px-2 py-1 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @change="onFilterChange"
        />
      </label>
      <input
        v-model="filterKeyword"
        type="text"
        placeholder="Tìm theo mã đơn..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>
    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>

    <EmptyState
      v-else-if="orders.length === 0"
      class="mt-4"
      icon="📦"
      title="Không tìm thấy đơn hàng nào"
      description="Bạn chưa có đơn hàng nào khớp với bộ lọc hiện tại."
      action-label="Tiếp tục mua sắm"
      @action="goHome"
    />

    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-lg bg-surface shadow-sm">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-3 py-2 text-left">Mã đơn</th>
              <th class="px-3 py-2 text-left">Ngày đặt</th>
              <th class="px-3 py-2 text-left">Tổng tiền</th>
              <th class="px-3 py-2 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in orders"
              :key="order.id"
              class="cursor-pointer border-b border-border hover:bg-background"
              tabindex="0"
              @click="goToDetail(order)"
              @keyup.enter="goToDetail(order)"
            >
              <td class="px-3 py-3">{{ order.order_code }}</td>
              <td class="px-3 py-3">{{ formatDate(order.created_at) }}</td>
              <td class="px-3 py-3">{{ formatPrice(order.total_amount) }}</td>
              <td class="px-3 py-3"><StatusBadge :status="order.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>
  </div>
</template>
