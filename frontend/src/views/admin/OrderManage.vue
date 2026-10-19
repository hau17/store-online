<script setup>
// Quản lý đơn hàng: danh sách toàn bộ đơn (all=true) + filter trạng thái/khoảng ngày/tìm kiếm +
// phân trang + modal chi tiết với khu vực đổi trạng thái (chỉ hiện đúng các lựa chọn hợp lệ tiếp
// theo theo payment_method, dùng chung map ORDER_STATUS_FLOW với backend để không hiển thị lựa chọn
// nào rồi bị backend từ chối).
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import orderService from '../../services/order.service';
import {
  ORDER_STATUS_LABELS,
  getNextStatuses,
  isConfirmTransition,
  isRestockTransition,
} from '../../utils/orderStatusFlow';
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import BaseButton from '../../components/common/BaseButton.vue';

const PAYMENT_STATUS_LABELS = {
  pending: 'Chờ thanh toán',
  success: 'Đã nhận tiền',
  failed: 'Lệch số tiền, cần đối soát',
  cancelled: 'Đã hủy',
};

const route = useRoute();
const { showToast } = useToast();

const orders = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

// Cho phép mở trang này kèm sẵn từ khóa qua URL (vd link "Xem đơn hàng liên quan" ở CustomerManage.vue)
const filterStatus = ref('');
const filterFromDate = ref('');
const filterToDate = ref('');
const filterKeyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '');
let debounceTimer = null;

const showDetail = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detailOrder = ref(null);

const newStatus = ref('');
const statusNote = ref('');
const updating = ref(false);
const updateError = ref('');

const nextStatuses = computed(() =>
  detailOrder.value ? getNextStatuses(detailOrder.value.payment_method, detailOrder.value.status) : []
);
const paymentReceived = computed(() => detailOrder.value?.payment?.status === 'success');

// Khớp đúng các trường hợp backend bắt buộc note (updateOrderStatus) để báo lỗi ngay phía client.
const noteRequiredMessage = computed(() => {
  if (!detailOrder.value || !newStatus.value) return '';
  const current = detailOrder.value.status;
  if (isRestockTransition(current, newStatus.value)) return 'Vui lòng nhập lý do (bắt buộc khi hoàn kho)';
  if (newStatus.value === 'paid') return 'Vui lòng ghi chú kết quả đối soát (vd mã giao dịch ngân hàng)';
  if (current === 'pending' && newStatus.value === 'cancelled' && paymentReceived.value) {
    return 'Đơn đã nhận tiền — vui lòng ghi chú việc hoàn tiền cho khách';
  }
  return '';
});

const statusHint = computed(() => {
  if (!detailOrder.value || !newStatus.value) return '';
  const current = detailOrder.value.status;
  if (isConfirmTransition(current, newStatus.value)) {
    return 'Xác nhận đơn sẽ trừ tồn kho. Nếu không đủ hàng, hệ thống sẽ từ chối.';
  }
  if (isRestockTransition(current, newStatus.value)) {
    return 'Hành động này sẽ hoàn lại số lượng tồn kho đã trừ trước đó.';
  }
  return '';
});

function statusOptionLabel(status) {
  if (detailOrder.value?.status === 'pending' && status === 'paid') return 'Xác nhận đã nhận tiền (Đã thanh toán)';
  if (detailOrder.value?.status === 'pending' && status === 'processing') return 'Xác nhận đơn COD (Đang chuẩn bị)';
  return ORDER_STATUS_LABELS[status];
}

async function fetchOrders(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await orderService.getOrders({
      all: true,
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

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
  return new Date(value).toLocaleString('vi-VN');
}

async function openDetail(order) {
  showDetail.value = true;
  detailLoading.value = true;
  detailError.value = '';
  detailOrder.value = null;
  newStatus.value = '';
  statusNote.value = '';
  updateError.value = '';
  try {
    const res = await orderService.getOrderById(order.id);
    detailOrder.value = res.data.data;
  } catch (err) {
    detailError.value = err.response?.data?.message || 'Không tải được chi tiết đơn hàng';
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  showDetail.value = false;
}

async function submitStatusUpdate() {
  if (!newStatus.value) {
    updateError.value = 'Vui lòng chọn trạng thái mới';
    return;
  }
  if (noteRequiredMessage.value && !statusNote.value.trim()) {
    updateError.value = noteRequiredMessage.value;
    return;
  }

  updating.value = true;
  updateError.value = '';
  try {
    await orderService.updateOrderStatus(detailOrder.value.id, {
      status: newStatus.value,
      note: statusNote.value || undefined,
    });
    // Cập nhật lại UI ngay (không đợi socket vì đây là admin tự thao tác) — khách nếu đang mở
    // trang chi tiết đơn này sẽ tự nhận được update qua socket 'order:status_updated' đã code sẵn.
    const res = await orderService.getOrderById(detailOrder.value.id);
    detailOrder.value = res.data.data;
    newStatus.value = '';
    statusNote.value = '';
    showToast('Cập nhật trạng thái đơn hàng thành công');
    await fetchOrders(pagination.value.page);
  } catch (err) {
    updateError.value = err.response?.data?.message || 'Cập nhật trạng thái thất bại';
  } finally {
    updating.value = false;
  }
}

onMounted(() => fetchOrders(1));
</script>

<template>
  <div>
    <h1>Quản lý đơn hàng</h1>

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
        placeholder="Tìm theo mã đơn hoặc tên khách..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>
    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>

    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-lg bg-surface shadow-sm">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-3 py-2 text-left">Mã đơn</th>
              <th class="px-3 py-2 text-left">Khách hàng</th>
              <th class="px-3 py-2 text-left">Tổng tiền</th>
              <th class="px-3 py-2 text-left">Thanh toán</th>
              <th class="px-3 py-2 text-left">Trạng thái</th>
              <th class="px-3 py-2 text-left">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in orders"
              :key="order.id"
              class="cursor-pointer border-b border-border hover:bg-background"
              tabindex="0"
              @click="openDetail(order)"
              @keyup.enter="openDetail(order)"
            >
              <td class="px-3 py-2">{{ order.order_code }}</td>
              <td class="px-3 py-2">{{ order.shipping_name }}</td>
              <td class="px-3 py-2">{{ formatPrice(order.total_amount) }}</td>
              <td class="px-3 py-2">{{ order.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'COD' }}</td>
              <td class="px-3 py-2"><StatusBadge :status="order.status" /></td>
              <td class="px-3 py-2">{{ formatDate(order.created_at) }}</td>
            </tr>
            <tr v-if="orders.length === 0">
              <td colspan="6" class="px-3 py-6 text-center text-text-secondary">Không có đơn hàng nào.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <!-- Modal chi tiết đơn hàng -->
    <div v-if="showDetail" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" @click.self="closeDetail">
      <div class="relative max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-lg bg-surface p-6 shadow-md">
        <button
          type="button"
          class="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-text-secondary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Đóng"
          @click="closeDetail"
        >
          ×
        </button>
        <p v-if="detailLoading" class="text-text-secondary">Đang tải...</p>
        <p v-else-if="detailError" class="text-danger">{{ detailError }}</p>
        <template v-else-if="detailOrder">
          <h3 class="flex flex-wrap items-center gap-2">
            Đơn {{ detailOrder.order_code }}
            <StatusBadge :status="detailOrder.status" />
          </h3>

          <div class="mt-3 overflow-x-auto">
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
                <tr v-for="item in detailOrder.items" :key="item.book_id" class="border-b border-border">
                  <td class="px-2 py-2">{{ item.book_title }}</td>
                  <td class="px-2 py-2">{{ item.quantity }}</td>
                  <td class="px-2 py-2">{{ formatPrice(item.price) }}</td>
                  <td class="px-2 py-2">{{ formatPrice(item.price * item.quantity) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-right text-[15px]">Tổng tiền: <strong class="text-accent">{{ formatPrice(detailOrder.total_amount) }}</strong></p>

          <p class="mt-3 text-[15px]"><strong>Người nhận:</strong> {{ detailOrder.shipping_name }} — {{ detailOrder.shipping_phone }}</p>
          <p class="text-[15px]"><strong>Địa chỉ:</strong> {{ detailOrder.shipping_address }}</p>
          <p v-if="detailOrder.note" class="text-[15px]"><strong>Ghi chú:</strong> {{ detailOrder.note }}</p>
          <p class="text-[15px]">
            <strong>Thanh toán:</strong>
            {{ detailOrder.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'COD' }}
            <span v-if="detailOrder.payment"> — {{ PAYMENT_STATUS_LABELS[detailOrder.payment.status] || detailOrder.payment.status }}</span>
          </p>
          <p v-if="detailOrder.status === 'pending' && paymentReceived" class="mt-2 rounded-lg bg-[#FEF3C7] p-3 text-sm text-warning">
            Đã nhận đủ tiền nhưng thiếu hàng. Nhập thêm hàng rồi xác nhận thanh toán, hoặc hủy đơn và hoàn tiền cho khách.
          </p>

          <h4 class="mt-4 font-display text-base font-semibold">Lịch sử trạng thái</h4>
          <ul class="mt-2 flex flex-col gap-2">
            <li v-for="(h, index) in detailOrder.status_history" :key="index" class="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge :status="h.status" />
              <span class="text-text-secondary">{{ formatDate(h.created_at) }}</span>
              <span v-if="h.note" class="text-text-secondary">— {{ h.note }}</span>
            </li>
          </ul>

          <div v-if="nextStatuses.length > 0" class="mt-4 flex flex-col items-start gap-3 border-t border-border pt-4">
            <h4 class="font-display text-base font-semibold">Đổi trạng thái</h4>
            <select
              v-model="newStatus"
              class="min-h-[44px] w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="" disabled>-- Chọn trạng thái mới --</option>
              <option v-for="s in nextStatuses" :key="s" :value="s">
                {{ statusOptionLabel(s) }}
              </option>
            </select>
            <p v-if="statusHint" class="text-sm text-warning">⚠ {{ statusHint }}</p>
            <input
              v-model="statusNote"
              type="text"
              :placeholder="noteRequiredMessage ? 'Ghi chú / lý do (bắt buộc)' : 'Ghi chú (không bắt buộc)'"
              class="min-h-[44px] w-full max-w-xs rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <BaseButton :loading="updating" @click="submitStatusUpdate">
              {{ updating ? 'Đang lưu...' : 'Cập nhật' }}
            </BaseButton>
            <p v-if="updateError" class="text-sm text-danger">{{ updateError }}</p>
          </div>
          <p v-else class="mt-4 text-sm text-text-secondary">Đơn hàng đã ở trạng thái cuối, không thể đổi thêm.</p>
        </template>
      </div>
    </div>
  </div>
</template>
