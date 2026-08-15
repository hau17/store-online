<script setup>
// Quản lý sách: bảng danh sách (tìm kiếm/lọc/phân trang) + form thêm/sửa + nút ẩn sách (soft-delete)
// + khu vực quản lý ảnh (upload nhiều ảnh, xóa ảnh, đặt ảnh đại diện) ngay trong form sửa.
// Admin đã đăng nhập nên api.js tự gắn token -> backend tự trả kèm cả sách đã ẩn (is_active = 0).
//
// LƯU Ý: stock_quantity KHÔNG có trong form thêm/sửa nữa — theo business rule mới, tồn kho chỉ
// tăng qua phiếu nhập hàng (module Stock Import) và giảm khi đơn hàng chuyển "paid", form sách
// không được phép set trực tiếp. Sách mới luôn bắt đầu với tồn kho = 0.
//
// LƯU Ý: ảnh KHÔNG còn là 1 field trong form sách (không có "URL ảnh" nữa) — sách phải được tạo
// xong (có book_id) trước, sau đó mới upload ảnh qua API riêng /api/books/:id/images.
import { ref, onMounted } from 'vue';
import bookService from '../../services/book.service';
import categoryService from '../../services/category.service';
import authorService from '../../services/author.service';
import publisherService from '../../services/publisher.service';

const PLACEHOLDER_IMAGE = 'https://placehold.co/60x80?text=No+Image';

const books = ref([]);
const categories = ref([]);
const authors = ref([]);
const publishers = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

const keyword = ref('');
const categoryId = ref('');
let debounceTimer = null;

const showForm = ref(false);
const editingId = ref(null); // có giá trị (kể cả vừa tạo xong) -> đủ điều kiện hiện khu vực Quản lý ảnh
const editingStockQuantity = ref(0); // chỉ để hiển thị tham khảo khi sửa, không gửi lên server
const emptyForm = () => ({
  category_id: '',
  author_id: '',
  publisher_id: '',
  title: '',
  description: '',
  price: '',
  is_active: 1,
});
const form = ref(emptyForm());
const formError = ref('');
const submitting = ref(false);

// ----- Quản lý ảnh -----
const bookImages = ref([]); // ảnh của sách đang mở form (tạo mới xong hoặc đang sửa)
const selectedFiles = ref([]); // file người dùng vừa chọn, chưa bấm "Tải lên"
const fileInputRef = ref(null);
const imageUploading = ref(false);
const imageError = ref('');

async function fetchBooks(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await bookService.getBooks({
      keyword: keyword.value || undefined,
      category_id: categoryId.value || undefined,
      page,
      limit: 10,
    });
    books.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách sách';
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const res = await categoryService.getCategories();
    categories.value = res.data.data.items;
  } catch (err) {
    console.error('Không tải được danh mục:', err);
  }
}

async function fetchAuthors() {
  try {
    const res = await authorService.getAuthors();
    authors.value = res.data.data.items;
  } catch (err) {
    console.error('Không tải được danh sách tác giả:', err);
  }
}

async function fetchPublishers() {
  try {
    const res = await publisherService.getPublishers();
    publishers.value = res.data.data.items;
  } catch (err) {
    console.error('Không tải được danh sách nhà xuất bản:', err);
  }
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchBooks(1), 400);
}

function onCategoryChange() {
  fetchBooks(1);
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.total_pages) return;
  fetchBooks(page);
}

// Trang danh sách sách (GET /api/books) chỉ trả primary_image_url, không có mảng images đầy đủ
// -> phải gọi riêng GET /api/books/:id để lấy đủ ảnh khi mở form sửa.
async function loadBookImages(bookId) {
  const res = await bookService.getBookById(bookId);
  bookImages.value = res.data.data.images || [];
}

function resetImageState() {
  bookImages.value = [];
  selectedFiles.value = [];
  imageError.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function openCreateForm() {
  editingId.value = null;
  editingStockQuantity.value = 0;
  form.value = emptyForm();
  formError.value = '';
  resetImageState();
  showForm.value = true;
}

async function openEditForm(book) {
  editingId.value = book.id;
  editingStockQuantity.value = book.stock_quantity;
  form.value = {
    category_id: book.category_id,
    author_id: book.author_id,
    publisher_id: book.publisher_id,
    title: book.title,
    description: book.description || '',
    price: book.price,
    is_active: book.is_active,
  };
  formError.value = '';
  resetImageState();
  showForm.value = true;
  await loadBookImages(book.id);
}

function cancelForm() {
  showForm.value = false;
}

async function submitForm() {
  if (!form.value.title.trim()) {
    formError.value = 'Tên sách không được để trống';
    return;
  }
  if (!form.value.category_id) {
    formError.value = 'Vui lòng chọn danh mục';
    return;
  }
  if (!form.value.author_id) {
    formError.value = 'Vui lòng chọn tác giả';
    return;
  }
  if (!form.value.publisher_id) {
    formError.value = 'Vui lòng chọn nhà xuất bản';
    return;
  }
  if (!(Number(form.value.price) > 0)) {
    formError.value = 'Giá sách phải lớn hơn 0';
    return;
  }

  submitting.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      await bookService.updateBook(editingId.value, form.value);
    } else {
      // Tạo sách xong (có book_id) -> CHUYỂN SANG chế độ sửa ngay trong form đang mở,
      // để khu vực "Quản lý ảnh" hiện ra mà không cần đóng form rồi mở lại.
      const res = await bookService.createBook(form.value);
      editingId.value = res.data.data.id;
      editingStockQuantity.value = res.data.data.stock_quantity;
    }
    await fetchBooks(pagination.value.page);
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu sách thất bại';
  } finally {
    submitting.value = false;
  }
}

function onFilesSelected(e) {
  selectedFiles.value = Array.from(e.target.files || []);
}

async function uploadSelectedImages() {
  if (selectedFiles.value.length === 0) return;

  imageUploading.value = true;
  imageError.value = '';
  try {
    // Ảnh gửi lên dạng multipart/form-data, field tên "images" (khớp upload.array('images', 5) ở backend)
    const formData = new FormData();
    for (const file of selectedFiles.value) {
      formData.append('images', file);
    }
    const res = await bookService.uploadBookImages(editingId.value, formData);
    bookImages.value = [...bookImages.value, ...res.data.data.images];
    selectedFiles.value = [];
    if (fileInputRef.value) fileInputRef.value.value = '';
    await fetchBooks(pagination.value.page); // cập nhật lại primary_image_url trong bảng nếu vừa đổi
  } catch (err) {
    // Lỗi thường gặp: ảnh > 5MB (FILE_TOO_LARGE) hoặc sai định dạng (INVALID_FILE) — backend đã
    // trả message rõ ràng, chỉ cần hiển thị lại nguyên văn.
    imageError.value = err.response?.data?.message || 'Tải ảnh lên thất bại';
  } finally {
    imageUploading.value = false;
  }
}

async function handleDeleteImage(img) {
  if (!confirm('Xóa ảnh này?')) return;
  imageError.value = '';
  try {
    await bookService.deleteBookImage(editingId.value, img.id);
    await loadBookImages(editingId.value);
    await fetchBooks(pagination.value.page);
  } catch (err) {
    imageError.value = err.response?.data?.message || 'Xóa ảnh thất bại';
  }
}

async function handleSetPrimary(img) {
  imageError.value = '';
  try {
    await bookService.setPrimaryImage(editingId.value, img.id);
    await loadBookImages(editingId.value);
    await fetchBooks(pagination.value.page);
  } catch (err) {
    imageError.value = err.response?.data?.message || 'Đặt ảnh đại diện thất bại';
  }
}

// Ẩn sách thay vì xóa cứng (đúng business rule trong spec) — book vẫn còn trong DB, chỉ set is_active = 0
async function handleHide(book) {
  if (!confirm(`Ẩn sách "${book.title}" khỏi cửa hàng?`)) return;
  errorMessage.value = '';
  try {
    await bookService.deleteBook(book.id);
    await fetchBooks(pagination.value.page);
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Ẩn sách thất bại';
  }
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

onMounted(() => {
  fetchCategories();
  fetchAuthors();
  fetchPublishers();
  fetchBooks(1);
});
</script>

<template>
  <div class="book-manage">
    <h1>Quản lý sách</h1>

    <div class="filters">
      <input v-model="keyword" type="text" placeholder="Tìm theo tên sách..." @input="onKeywordInput" />
      <select v-model="categoryId" @change="onCategoryChange">
        <option value="">Tất cả danh mục</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <button @click="openCreateForm">+ Thêm sách</button>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="showForm" class="form-box">
      <h3>{{ editingId ? 'Sửa sách' : 'Thêm sách' }}</h3>

      <div class="form-group">
        <label>Danh mục</label>
        <select v-model="form.category_id">
          <option value="" disabled>-- Chọn danh mục --</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Tên sách</label>
        <input v-model="form.title" type="text" />
      </div>
      <div class="form-group">
        <label>Tác giả</label>
        <select v-model="form.author_id">
          <option value="" disabled>-- Chọn tác giả --</option>
          <option v-for="a in authors" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <small>Chưa có trong danh sách? Vào "Quản lý tác giả" thêm trước.</small>
      </div>
      <div class="form-group">
        <label>Nhà xuất bản</label>
        <select v-model="form.publisher_id">
          <option value="" disabled>-- Chọn nhà xuất bản --</option>
          <option v-for="p in publishers" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <small>Chưa có trong danh sách? Vào "Quản lý NXB" thêm trước.</small>
      </div>
      <div class="form-group">
        <label>Mô tả</label>
        <textarea v-model="form.description" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label>Giá (đ)</label>
        <input v-model.number="form.price" type="number" min="0" />
      </div>
      <div v-if="editingId" class="form-group">
        <label>Tồn kho hiện tại</label>
        <input :value="editingStockQuantity" type="text" disabled />
        <small>Chỉ thay đổi được qua phiếu nhập hàng, không sửa trực tiếp ở đây.</small>
      </div>
      <div class="form-group checkbox">
        <label>
          <input v-model="form.is_active" type="checkbox" :true-value="1" :false-value="0" />
          Đang bán (bỏ tick = ẩn sách)
        </label>
      </div>

      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <button :disabled="submitting" @click="submitForm">{{ submitting ? 'Đang lưu...' : 'Lưu' }}</button>
        <button type="button" @click="cancelForm">{{ editingId ? 'Đóng' : 'Hủy' }}</button>
      </div>

      <!-- Chỉ hiện khi đã có book_id (sách vừa tạo xong hoặc đang sửa sách có sẵn) -->
      <div v-if="editingId" class="image-section">
        <h4>Quản lý ảnh</h4>

        <div class="image-grid">
          <div v-for="img in bookImages" :key="img.id" class="image-item">
            <img :src="img.image_url" alt="Ảnh sách" />
            <span v-if="img.is_primary" class="badge">Ảnh đại diện</span>
            <div class="image-actions">
              <button v-if="!img.is_primary" type="button" @click="handleSetPrimary(img)">Đặt làm đại diện</button>
              <button type="button" @click="handleDeleteImage(img)">Xóa</button>
            </div>
          </div>
          <p v-if="bookImages.length === 0" class="no-image">Sách chưa có ảnh nào.</p>
        </div>

        <div class="upload-box">
          <input ref="fileInputRef" type="file" accept="image/*" multiple @change="onFilesSelected" />
          <button type="button" :disabled="imageUploading || selectedFiles.length === 0" @click="uploadSelectedImages">
            {{ imageUploading ? 'Đang tải lên...' : 'Tải lên' }}
          </button>
          <small>Tối đa 5 ảnh/lần, mỗi ảnh ≤ 5MB, định dạng JPG/PNG/WEBP.</small>
          <p v-if="imageError" class="error">{{ imageError }}</p>
        </div>
      </div>
    </div>

    <p v-if="loading">Đang tải...</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>Ảnh</th>
            <th>ID</th>
            <th>Tên sách</th>
            <th>Tác giả</th>
            <th>NXB</th>
            <th>Danh mục</th>
            <th>Giá</th>
            <th>Tồn kho</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in books" :key="book.id" :class="{ inactive: !book.is_active }">
            <td><img class="thumb" :src="book.primary_image_url || PLACEHOLDER_IMAGE" alt="" /></td>
            <td>{{ book.id }}</td>
            <td>{{ book.title }}</td>
            <td>{{ book.author?.name }}</td>
            <td>{{ book.publisher?.name }}</td>
            <td>{{ book.category?.name }}</td>
            <td>{{ formatPrice(book.price) }}</td>
            <td>{{ book.stock_quantity }}</td>
            <td>{{ book.is_active ? 'Đang bán' : 'Đã ẩn' }}</td>
            <td>
              <button @click="openEditForm(book)">Sửa</button>
              <button v-if="book.is_active" @click="handleHide(book)">Ẩn</button>
            </td>
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
  </div>
</template>

<style scoped>
.book-manage {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.filters input {
  flex: 1;
  padding: 8px;
}
.filters select {
  padding: 8px;
}
.form-box {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  max-width: 480px;
}
.form-group {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group.checkbox {
  flex-direction: row;
  align-items: center;
}
.form-group small {
  color: #888;
  font-size: 12px;
}
.form-actions {
  display: flex;
  gap: 8px;
}
.image-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ddd;
}
.image-section h4 {
  margin-bottom: 10px;
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.image-item {
  position: relative;
  width: 100px;
}
.image-item img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ddd;
}
.badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: #d33;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}
.image-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}
.image-actions button {
  font-size: 11px;
  padding: 3px;
  margin-right: 0;
}
.no-image {
  color: #888;
  font-size: 13px;
}
.upload-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
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
.thumb {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 3px;
}
tr.inactive {
  opacity: 0.5;
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
</style>
