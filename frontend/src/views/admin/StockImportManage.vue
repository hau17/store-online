<script setup>
// Quản lý nhập hàng: danh sách phiếu nhập (filter + phân trang) + form tạo phiếu nhập mới +
// modal xem chi tiết. Đây là nơi DUY NHẤT (cùng với đơn hàng chuyển "paid") được phép làm
// stock_quantity của sách tăng lên — xem business rule mục 9.3 trong spec.
import { ref, computed, onMounted } from 'vue';
import stockImportService from '../../services/stockImport.service';
import supplierService from '../../services/supplier.service';
import bookService from '../../services/book.service';
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import BaseButton from '../../components/common/BaseButton.vue';

const { showToast } = useToast();

const stockImports = ref([]);
const suppliers = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

// ----- Filter -----
const filterSupplierId = ref('');
const filterFromDate = ref('');
const filterToDate = ref('');

// ----- Form tạo phiếu nhập -----
const showForm = ref(false);
const formSupplierId = ref('');
const formNote = ref('');
const formItems = ref([]); // { book_id, title, quantity, import_price }
const formError = ref('');
const submitting = ref(false);

// Tìm sách theo tên để thêm vào phiếu (autocomplete đơn giản, debounce giống Home.vue)
const bookKeyword = ref('');
const bookResults = ref([]);
let bookSearchTimer = null;

// ----- Modal chi tiết -----
const showDetail = ref(false);
const detailLoading = ref(false);
const detailData = ref(null);

async function fetchSuppliers() {
  try {
    // limit cao: đây là dropdown chọn nhà cung cấp, cần lấy HẾT chứ không chỉ trang đầu
    // (API giờ có phân trang, mặc định chỉ trả 10 dòng)
    const res = await supplierService.getSuppliers({ limit: 100 });
    suppliers.value = res.data.data.items;
  } catch (err) {
    console.error('Không tải được danh sách nhà cung cấp:', err);
  }
}

async function fetchStockImports(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await stockImportService.getStockImports({
      supplier_id: filterSupplierId.value || undefined,
      from_date: filterFromDate.value || undefined,
      to_date: filterToDate.value || undefined,
      page,
      limit: 10,
    });
    stockImports.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách phiếu nhập hàng';
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  fetchStockImports(1);
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.total_pages) return;
  fetchStockImports(page);
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
  return new Date(value).toLocaleString('vi-VN');
}

// Tổng tiền tạm tính trong form tạo phiếu — tự cộng dồn lại mỗi khi quantity/import_price đổi
// nhờ computed (reactive), không cần tự gọi hàm cập nhật thủ công.
const formTotalAmount = computed(() =>
  formItems.value.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.import_price) || 0),
    0
  )
);

function openCreateForm() {
  formSupplierId.value = '';
  formNote.value = '';
  formItems.value = [];
  formError.value = '';
  bookKeyword.value = '';
  bookResults.value = [];
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
}

function onBookKeywordInput() {
  clearTimeout(bookSearchTimer);
  bookSearchTimer = setTimeout(async () => {
    if (!bookKeyword.value.trim()) {
      bookResults.value = [];
      return;
    }
    try {
      const res = await bookService.getBooks({ keyword: bookKeyword.value, limit: 10 });
      bookResults.value = res.data.data.items;
    } catch (err) {
      console.error('Tìm sách thất bại:', err);
    }
  }, 400);
}

// Chọn 1 sách từ kết quả tìm kiếm -> thêm vào bảng tạm. Nếu sách đã có trong phiếu rồi thì cộng dồn
// số lượng lên 1 thay vì tạo dòng trùng (đơn giản hơn báo lỗi chặn, và đúng nghĩa nghiệp vụ: nhập
// thêm cùng 1 sách trong cùng phiếu = cộng dồn số lượng của dòng đó).
function addBookToForm(book) {
  const existing = formItems.value.find((item) => item.book_id === book.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    formItems.value.push({ book_id: book.id, title: book.title, quantity: 1, import_price: 0 });
  }
  bookKeyword.value = '';
  bookResults.value = [];
}

function removeFormItem(index) {
  formItems.value.splice(index, 1);
}

async function submitForm() {
  if (!formSupplierId.value) {
    formError.value = 'Vui lòng chọn nhà cung cấp';
    return;
  }
  if (formItems.value.length === 0) {
    formError.value = 'Vui lòng thêm ít nhất 1 sách vào phiếu nhập';
    return;
  }
  for (const item of formItems.value) {
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
      formError.value = `Số lượng sách "${item.title}" phải là số nguyên lớn hơn 0`;
      return;
    }
    if (!(Number(item.import_price) >= 0)) {
      formError.value = `Giá nhập sách "${item.title}" không hợp lệ`;
      return;
    }
  }

  submitting.value = true;
  formError.value = '';
  try {
    const res = await stockImportService.createStockImport({
      supplier_id: formSupplierId.value,
      note: formNote.value || undefined,
      items: formItems.value.map((item) => ({
        book_id: item.book_id,
        quantity: Number(item.quantity),
        import_price: Number(item.import_price),
      })),
    });
    showForm.value = false;
    showToast(`Tạo phiếu nhập "${res.data.data.import_code}" thành công`);
    await fetchStockImports(1);
  } catch (err) {
    // Trường hợp phổ biến: BOOK_NOT_FOUND, VALIDATION_ERROR — backend đã trả message rõ ràng.
    formError.value = err.response?.data?.message || 'Tạo phiếu nhập hàng thất bại';
  } finally {
    submitting.value = false;
  }
}

async function openDetail(stockImport) {
  showDetail.value = true;
  detailLoading.value = true;
  detailData.value = null;
  try {
    const res = await stockImportService.getStockImportById(stockImport.id);
    detailData.value = res.data.data;
  } catch (err) {
    detailData.value = { error: err.response?.data?.message || 'Không tải được chi tiết phiếu nhập' };
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  showDetail.value = false;
}

onMounted(() => {
  fetchSuppliers();
  fetchStockImports(1);
});
</script>

<template>
  <div>
    <h1>Quản lý nhập hàng</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <select
        v-model="filterSupplierId"
        class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @change="onFilterChange"
      >
        <option value="">Tất cả nhà cung cấp</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
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
      <BaseButton @click="openCreateForm">+ Tạo phiếu nhập mới</BaseButton>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>

    <div v-if="showForm" class="mt-4 max-w-2xl rounded-lg bg-surface p-5 shadow-sm">
      <h3>Tạo phiếu nhập hàng</h3>

      <div class="mt-3 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Nhà cung cấp</label>
          <select
            v-model="formSupplierId"
            class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="" disabled>-- Chọn nhà cung cấp --</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Ghi chú</label>
          <input
            v-model="formNote"
            type="text"
            placeholder="Không bắt buộc"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div class="relative flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Thêm sách</label>
          <input
            v-model="bookKeyword"
            type="text"
            placeholder="Gõ tên sách để tìm..."
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @input="onBookKeywordInput"
          />
          <div v-if="bookResults.length > 0" class="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface shadow-md">
            <div
              v-for="book in bookResults"
              :key="book.id"
              class="cursor-pointer px-3 py-2 text-sm hover:bg-background"
              @click="addBookToForm(book)"
            >
              {{ book.title }}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 overflow-x-auto">
        <table v-if="formItems.length > 0" class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-2 py-2 text-left">Sách</th>
              <th class="px-2 py-2 text-left">Số lượng</th>
              <th class="px-2 py-2 text-left">Giá nhập</th>
              <th class="px-2 py-2 text-left">Thành tiền</th>
              <th class="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in formItems" :key="item.book_id" class="border-b border-border">
              <td class="px-2 py-2">{{ item.title }}</td>
              <td class="px-2 py-2">
                <input
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  class="w-20 rounded-lg border border-border px-2 py-1 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </td>
              <td class="px-2 py-2">
                <input
                  v-model.number="item.import_price"
                  type="number"
                  min="0"
                  class="w-24 rounded-lg border border-border px-2 py-1 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </td>
              <td class="px-2 py-2">{{ formatPrice((Number(item.quantity) || 0) * (Number(item.import_price) || 0)) }}</td>
              <td class="px-2 py-2">
                <button type="button" class="text-danger hover:underline" @click="removeFormItem(index)">Xóa</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-sm text-text-secondary">Chưa có sách nào trong phiếu nhập.</p>
      </div>

      <p class="mt-3 text-[15px]">Tổng tiền tạm tính: <strong class="text-accent">{{ formatPrice(formTotalAmount) }}</strong></p>

      <p v-if="formError" class="mt-2 text-sm text-danger">{{ formError }}</p>
      <div class="mt-4 flex gap-2">
        <BaseButton :loading="submitting" @click="submitForm">
          {{ submitting ? 'Đang lưu...' : 'Lưu phiếu nhập' }}
        </BaseButton>
        <BaseButton variant="secondary" type="button" @click="cancelForm">Hủy</BaseButton>
      </div>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>
    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-lg bg-surface shadow-sm">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-3 py-2 text-left">Mã phiếu</th>
              <th class="px-3 py-2 text-left">Nhà cung cấp</th>
              <th class="px-3 py-2 text-left">Tổng tiền</th>
              <th class="px-3 py-2 text-left">Người tạo</th>
              <th class="px-3 py-2 text-left">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in stockImports"
              :key="item.id"
              class="cursor-pointer border-b border-border hover:bg-background"
              tabindex="0"
              @click="openDetail(item)"
              @keyup.enter="openDetail(item)"
            >
              <td class="px-3 py-2">{{ item.import_code }}</td>
              <td class="px-3 py-2">{{ item.supplier?.name }}</td>
              <td class="px-3 py-2">{{ formatPrice(item.total_amount) }}</td>
              <td class="px-3 py-2">{{ item.created_by?.full_name }}</td>
              <td class="px-3 py-2">{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="stockImports.length === 0">
              <td colspan="5" class="px-3 py-6 text-center text-text-secondary">Chưa có phiếu nhập hàng nào.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <!-- Modal xem chi tiết 1 phiếu nhập -->
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
        <template v-else-if="detailData">
          <p v-if="detailData.error" class="text-danger">{{ detailData.error }}</p>
          <template v-else>
            <h3>Phiếu nhập {{ detailData.import_code }}</h3>
            <p class="mt-2 text-[15px]"><strong>Nhà cung cấp:</strong> {{ detailData.supplier?.name }}</p>
            <p class="text-[15px]"><strong>Người tạo:</strong> {{ detailData.created_by?.full_name }}</p>
            <p class="text-[15px]"><strong>Ngày tạo:</strong> {{ formatDate(detailData.created_at) }}</p>
            <p v-if="detailData.note" class="text-[15px]"><strong>Ghi chú:</strong> {{ detailData.note }}</p>

            <div class="mt-3 overflow-x-auto">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
                    <th class="px-2 py-2 text-left">Sách</th>
                    <th class="px-2 py-2 text-left">Số lượng</th>
                    <th class="px-2 py-2 text-left">Giá nhập</th>
                    <th class="px-2 py-2 text-left">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in detailData.items" :key="item.book_id" class="border-b border-border">
                    <td class="px-2 py-2">{{ item.title }}</td>
                    <td class="px-2 py-2">{{ item.quantity }}</td>
                    <td class="px-2 py-2">{{ formatPrice(item.import_price) }}</td>
                    <td class="px-2 py-2">{{ formatPrice(item.quantity * item.import_price) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-right text-[15px]">Tổng tiền: <strong class="text-accent">{{ formatPrice(detailData.total_amount) }}</strong></p>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
