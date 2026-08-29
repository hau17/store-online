<script setup>
// Quản lý khách hàng: danh sách + tìm kiếm/lọc trạng thái + phân trang + khóa/mở khóa +
// modal xem chi tiết (mục 6.11).
import { ref, onMounted } from 'vue';
import userService from '../../services/user.service';
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';

const { showToast } = useToast();

const customers = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

const filterKeyword = ref('');
const filterStatus = ref('');
let debounceTimer = null;

const showDetail = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detailCustomer = ref(null);

// { show, action: 'lock' | 'unlock', customer, reason }
const confirmState = ref({ show: false, action: null, customer: null, reason: undefined });

async function fetchCustomers(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await userService.getCustomers({
      keyword: filterKeyword.value || undefined,
      status: filterStatus.value || undefined,
      page,
      limit: 10,
    });
    customers.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách khách hàng';
  } finally {
    loading.value = false;
  }
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchCustomers(1), 400);
}

function onFilterChange() {
  fetchCustomers(1);
}

function goToPage(page) {
  fetchCustomers(page);
}

function formatDate(value) {
  return new Date(value).toLocaleString('vi-VN');
}

async function openDetail(customer) {
  showDetail.value = true;
  detailLoading.value = true;
  detailError.value = '';
  detailCustomer.value = null;
  try {
    const res = await userService.getCustomerById(customer.id);
    detailCustomer.value = res.data.data;
  } catch (err) {
    detailError.value = err.response?.data?.message || 'Không tải được chi tiết khách hàng';
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  showDetail.value = false;
}

function askLock(customer) {
  const reason = prompt(`Lý do khóa tài khoản "${customer.full_name}" (không bắt buộc):`);
  if (reason === null) return; // bấm Cancel trên hộp thoại -> hủy thao tác
  confirmState.value = { show: true, action: 'lock', customer, reason: reason || undefined };
}

function askUnlock(customer) {
  confirmState.value = { show: true, action: 'unlock', customer, reason: undefined };
}

async function handleConfirm() {
  const { action, customer, reason } = confirmState.value;
  confirmState.value = { show: false, action: null, customer: null, reason: undefined };
  errorMessage.value = '';
  try {
    if (action === 'lock') {
      await userService.lockCustomer(customer.id, reason);
      showToast(`Đã khóa tài khoản "${customer.full_name}"`);
    } else {
      await userService.unlockCustomer(customer.id);
      showToast(`Đã mở khóa tài khoản "${customer.full_name}"`);
    }
    await fetchCustomers(pagination.value.page);
    if (showDetail.value && detailCustomer.value?.id === customer.id) await openDetail(customer);
  } catch (err) {
    // Trường hợp phổ biến: 400 CANNOT_LOCK_ADMIN nếu lỡ cố khóa 1 tài khoản admin
    errorMessage.value = err.response?.data?.message || 'Thao tác thất bại';
  }
}

onMounted(() => fetchCustomers(1));
</script>

<template>
  <div>
    <h1>Quản lý khách hàng</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <input
        v-model="filterKeyword"
        type="text"
        placeholder="Tìm theo tên hoặc email..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
      <select
        v-model="filterStatus"
        class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @change="onFilterChange"
      >
        <option value="">Tất cả</option>
        <option value="active">Đang hoạt động</option>
        <option value="locked">Đã khóa</option>
      </select>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>
    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>

    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-lg bg-surface shadow-sm">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-3 py-2 text-left">Tên</th>
              <th class="px-3 py-2 text-left">Email</th>
              <th class="px-3 py-2 text-left">SĐT</th>
              <th class="px-3 py-2 text-left">Số đơn</th>
              <th class="px-3 py-2 text-left">Trạng thái</th>
              <th class="px-3 py-2 text-left">Ngày tạo</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in customers" :key="customer.id" class="border-b border-border hover:bg-background">
              <td class="cursor-pointer px-3 py-2 text-primary hover:underline" @click="openDetail(customer)">{{ customer.full_name }}</td>
              <td class="px-3 py-2">{{ customer.email }}</td>
              <td class="px-3 py-2">{{ customer.phone }}</td>
              <td class="px-3 py-2">{{ customer.total_orders }}</td>
              <td class="px-3 py-2"><StatusBadge :status="customer.is_active ? 'active' : 'locked'" /></td>
              <td class="px-3 py-2">{{ formatDate(customer.created_at) }}</td>
              <td class="px-3 py-2">
                <button v-if="customer.is_active" type="button" class="text-danger hover:underline" @click="askLock(customer)">Khóa</button>
                <button v-else type="button" class="text-primary hover:underline" @click="askUnlock(customer)">Mở khóa</button>
              </td>
            </tr>
            <tr v-if="customers.length === 0">
              <td colspan="7" class="px-3 py-6 text-center text-text-secondary">Không có khách hàng nào.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <!-- Modal chi tiết khách hàng -->
    <div v-if="showDetail" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" @click.self="closeDetail">
      <div class="relative w-full max-w-md rounded-lg bg-surface p-6 shadow-md">
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
        <template v-else-if="detailCustomer">
          <h3 class="flex flex-wrap items-center gap-2">
            {{ detailCustomer.full_name }}
            <StatusBadge :status="detailCustomer.is_active ? 'active' : 'locked'" />
          </h3>
          <p class="mt-2 text-[15px]"><strong>Email:</strong> {{ detailCustomer.email }}</p>
          <p class="text-[15px]"><strong>SĐT:</strong> {{ detailCustomer.phone || 'Chưa cập nhật' }}</p>
          <p class="text-[15px]"><strong>Địa chỉ:</strong> {{ detailCustomer.address || 'Chưa cập nhật' }}</p>
          <p class="text-[15px]"><strong>Số đơn đã đặt:</strong> {{ detailCustomer.total_orders }}</p>
          <p class="text-[15px]"><strong>Ngày tạo:</strong> {{ formatDate(detailCustomer.created_at) }}</p>
          <!-- Dùng tên khách làm keyword tìm trên OrderManage.vue (khớp shipping_name) — không phải
               lọc chính xác theo user_id vì backend hiện chỉ hỗ trợ tìm theo order_code/shipping_name. -->
          <router-link
            :to="`/admin/orders?keyword=${encodeURIComponent(detailCustomer.full_name)}`"
            class="mt-3 inline-block text-primary hover:underline"
          >
            Xem đơn hàng liên quan
          </router-link>
        </template>
      </div>
    </div>

    <ConfirmDialog
      :show="confirmState.show"
      :title="confirmState.action === 'lock' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'"
      :message="`${confirmState.action === 'lock' ? 'Xác nhận khóa' : 'Mở khóa'} tài khoản “${confirmState.customer?.full_name}”?`"
      :confirm-label="confirmState.action === 'lock' ? 'Khóa' : 'Mở khóa'"
      @confirm="handleConfirm"
      @cancel="confirmState.show = false"
    />
  </div>
</template>
