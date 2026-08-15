<script setup>
// Quản lý nhập hàng: danh sách phiếu nhập (filter + phân trang) + form tạo phiếu nhập mới +
// modal xem chi tiết. Đây là nơi DUY NHẤT (cùng với đơn hàng chuyển "paid") được phép làm
// stock_quantity của sách tăng lên — xem business rule mục 9.3 trong spec.
import { ref, computed, onMounted } from 'vue';
import stockImportService from '../../services/stockImport.service';
import supplierService from '../../services/supplier.service';
import bookService from '../../services/book.service';

const stockImports = ref([]);
const suppliers = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

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
    const res = await supplierService.getSuppliers();
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
    successMessage.value = `Tạo phiếu nhập "${res.data.data.import_code}" thành công`;
    setTimeout(() => (successMessage.value = ''), 5000);
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
  <div class="stock-import-manage">
    <h1>Quản lý nhập hàng</h1>

    <div class="filters">
      <select v-model="filterSupplierId" @change="onFilterChange">
        <option value="">Tất cả nhà cung cấp</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <label class="date-filter">
        Từ ngày
        <input v-model="filterFromDate" type="date" @change="onFilterChange" />
      </label>
      <label class="date-filter">
        Đến ngày
        <input v-model="filterToDate" type="date" @change="onFilterChange" />
      </label>
      <button @click="openCreateForm">+ Tạo phiếu nhập mới</button>
    </div>

    <p v-if="successMessage" class="success">{{ successMessage }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="showForm" class="form-box">
      <h3>Tạo phiếu nhập hàng</h3>

      <div class="form-group">
        <label>Nhà cung cấp</label>
        <select v-model="formSupplierId">
          <option value="" disabled>-- Chọn nhà cung cấp --</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <input v-model="formNote" type="text" placeholder="Không bắt buộc" />
      </div>

      <div class="form-group book-search">
        <label>Thêm sách</label>
        <input
          v-model="bookKeyword"
          type="text"
          placeholder="Gõ tên sách để tìm..."
          @input="onBookKeywordInput"
        />
        <div v-if="bookResults.length > 0" class="book-search-results">
          <div
            v-for="book in bookResults"
            :key="book.id"
            class="book-search-item"
            @click="addBookToForm(book)"
          >
            {{ book.title }}
          </div>
        </div>
      </div>

      <table v-if="formItems.length > 0" class="item-table">
        <thead>
          <tr>
            <th>Sách</th>
            <th>Số lượng</th>
            <th>Giá nhập</th>
            <th>Thành tiền</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in formItems" :key="item.book_id">
            <td>{{ item.title }}</td>
            <td><input v-model.number="item.quantity" type="number" min="1" /></td>
            <td><input v-model.number="item.import_price" type="number" min="0" /></td>
            <td>{{ formatPrice((Number(item.quantity) || 0) * (Number(item.import_price) || 0)) }}</td>
            <td><button type="button" @click="removeFormItem(index)">Xóa</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="no-items">Chưa có sách nào trong phiếu nhập.</p>

      <p class="total-amount">Tổng tiền tạm tính: <strong>{{ formatPrice(formTotalAmount) }}</strong></p>

      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <button :disabled="submitting" @click="submitForm">
          {{ submitting ? 'Đang lưu...' : 'Lưu phiếu nhập' }}
        </button>
        <button type="button" @click="cancelForm">Hủy</button>
      </div>
    </div>

    <p v-if="loading">Đang tải...</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>Mã phiếu</th>
            <th>Nhà cung cấp</th>
            <th>Tổng tiền</th>
            <th>Người tạo</th>
            <th>Ngày tạo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in stockImports" :key="item.id" class="clickable-row" @click="openDetail(item)">
            <td>{{ item.import_code }}</td>
            <td>{{ item.supplier?.name }}</td>
            <td>{{ formatPrice(item.total_amount) }}</td>
            <td>{{ item.created_by?.full_name }}</td>
            <td>{{ formatDate(item.created_at) }}</td>
          </tr>
          <tr v-if="stockImports.length === 0">
            <td colspan="5" class="no-items">Chưa có phiếu nhập hàng nào.</td>
          </tr>
        </tbody>
      </table>

      <div v-if="pagination.total_pages > 1" class="pagination">
        <button :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
        <span>Trang {{ pagination.page }} / {{ pagination.total_pages }}</span>
        <button :disabled="pagination.page >= pagination.total_pages" @click="goToPage(pagination.page + 1)">
          Sau
        </button>
      </div>
    </template>

    <!-- Modal xem chi tiết 1 phiếu nhập -->
    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-box">
        <button class="modal-close" type="button" @click="closeDetail">×</button>
        <p v-if="detailLoading">Đang tải...</p>
        <template v-else-if="detailData">
          <p v-if="detailData.error" class="error">{{ detailData.error }}</p>
          <template v-else>
            <h3>Phiếu nhập {{ detailData.import_code }}</h3>
            <p><strong>Nhà cung cấp:</strong> {{ detailData.supplier?.name }}</p>
            <p><strong>Người tạo:</strong> {{ detailData.created_by?.full_name }}</p>
            <p><strong>Ngày tạo:</strong> {{ formatDate(detailData.created_at) }}</p>
            <p v-if="detailData.note"><strong>Ghi chú:</strong> {{ detailData.note }}</p>

            <table class="item-table">
              <thead>
                <tr>
                  <th>Sách</th>
                  <th>Số lượng</th>
                  <th>Giá nhập</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in detailData.items" :key="item.book_id">
                  <td>{{ item.title }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ formatPrice(item.import_price) }}</td>
                  <td>{{ formatPrice(item.quantity * item.import_price) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="total-amount">Tổng tiền: <strong>{{ formatPrice(detailData.total_amount) }}</strong></p>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stock-import-manage {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filters select {
  padding: 8px;
}
.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #444;
}
.date-filter input {
  padding: 6px;
}
.form-box {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  max-width: 560px;
}
.form-group {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.book-search {
  position: relative;
}
.book-search-results {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 160px;
  overflow-y: auto;
  background: #fff;
}
.book-search-item {
  padding: 6px 8px;
  cursor: pointer;
  font-size: 14px;
}
.book-search-item:hover {
  background: #f5f5f5;
}
.item-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.item-table th,
.item-table td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: left;
  font-size: 13px;
}
.item-table input {
  width: 80px;
  padding: 4px;
}
.no-items {
  color: #888;
  font-size: 13px;
}
.total-amount {
  margin-top: 10px;
  font-size: 15px;
}
.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  font-size: 14px;
}
.clickable-row {
  cursor: pointer;
}
.clickable-row:hover {
  background: #f5f5f5;
}
button {
  cursor: pointer;
  margin-right: 4px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
.error {
  color: #d33;
}
.success {
  color: #1a7f37;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-box {
  position: relative;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #666;
}
</style>
