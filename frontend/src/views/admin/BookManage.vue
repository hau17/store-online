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
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
import BaseButton from '../../components/common/BaseButton.vue';

const PLACEHOLDER_IMAGE = 'https://placehold.co/60x80?text=No+Image';

const { showToast } = useToast();

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

// ----- Confirm ẩn sách / xóa ảnh -----
const confirmHide = ref({ show: false, book: null });
const confirmDeleteImage = ref({ show: false, image: null });

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

// limit cao ở cả 3 hàm dưới: đây là dropdown chọn cho form sách, cần lấy HẾT danh mục/tác giả/NXB
// chứ không chỉ trang đầu (các API này giờ có phân trang, mặc định chỉ trả 10 dòng).
async function fetchCategories() {
  try {
    const res = await categoryService.getCategories({ limit: 100 });
    categories.value = res.data.data.items;
  } catch (err) {
    console.error('Không tải được danh mục:', err);
  }
}

async function fetchAuthors() {
  try {
    const res = await authorService.getAuthors({ limit: 100 });
    authors.value = res.data.data.items;
  } catch (err) {
    console.error('Không tải được danh sách tác giả:', err);
  }
}

async function fetchPublishers() {
  try {
    const res = await publisherService.getPublishers({ limit: 100 });
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
      showToast('Cập nhật sách thành công');
    } else {
      // Tạo sách xong (có book_id) -> CHUYỂN SANG chế độ sửa ngay trong form đang mở,
      // để khu vực "Quản lý ảnh" hiện ra mà không cần đóng form rồi mở lại.
      const res = await bookService.createBook(form.value);
      editingId.value = res.data.data.id;
      editingStockQuantity.value = res.data.data.stock_quantity;
      showToast('Tạo sách thành công');
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

function askDeleteImage(img) {
  confirmDeleteImage.value = { show: true, image: img };
}

async function confirmDeleteImageAction() {
  const img = confirmDeleteImage.value.image;
  confirmDeleteImage.value = { show: false, image: null };
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
function askHide(book) {
  confirmHide.value = { show: true, book };
}

async function confirmHideBook() {
  const book = confirmHide.value.book;
  confirmHide.value = { show: false, book: null };
  errorMessage.value = '';
  try {
    await bookService.deleteBook(book.id);
    showToast('Đã ẩn sách khỏi cửa hàng');
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
  <div>
    <h1>Quản lý sách</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <input
        v-model="keyword"
        type="text"
        placeholder="Tìm theo tên sách..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
      <select
        v-model="categoryId"
        class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @change="onCategoryChange"
      >
        <option value="">Tất cả danh mục</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <BaseButton @click="openCreateForm">+ Thêm sách</BaseButton>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>

    <div v-if="showForm" class="mt-4 max-w-lg rounded-lg bg-surface p-5 shadow-sm">
      <h3>{{ editingId ? 'Sửa sách' : 'Thêm sách' }}</h3>

      <div class="mt-3 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Danh mục</label>
          <select
            v-model="form.category_id"
            class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="" disabled>-- Chọn danh mục --</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tên sách</label>
          <input
            v-model="form.title"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tác giả</label>
          <select
            v-model="form.author_id"
            class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="" disabled>-- Chọn tác giả --</option>
            <option v-for="a in authors" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <small class="text-text-secondary">Chưa có trong danh sách? Vào "Quản lý tác giả" thêm trước.</small>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Nhà xuất bản</label>
          <select
            v-model="form.publisher_id"
            class="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="" disabled>-- Chọn nhà xuất bản --</option>
            <option v-for="p in publishers" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <small class="text-text-secondary">Chưa có trong danh sách? Vào "Quản lý NXB" thêm trước.</small>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Mô tả</label>
          <textarea
            v-model="form.description"
            rows="2"
            class="rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          ></textarea>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Giá (đ)</label>
          <input
            v-model.number="form.price"
            type="number"
            min="0"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div v-if="editingId" class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tồn kho hiện tại</label>
          <input
            :value="editingStockQuantity"
            type="text"
            disabled
            class="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-text-secondary"
          />
          <small class="text-text-secondary">Chỉ thay đổi được qua phiếu nhập hàng, không sửa trực tiếp ở đây.</small>
        </div>
        <label class="flex min-h-[44px] items-center gap-2 text-[15px]">
          <input v-model="form.is_active" type="checkbox" :true-value="1" :false-value="0" class="h-4 w-4 accent-primary" />
          Đang bán (bỏ tick = ẩn sách)
        </label>
      </div>

      <p v-if="formError" class="mt-3 text-sm text-danger">{{ formError }}</p>
      <div class="mt-4 flex gap-2">
        <BaseButton :loading="submitting" @click="submitForm">{{ submitting ? 'Đang lưu...' : 'Lưu' }}</BaseButton>
        <BaseButton variant="secondary" type="button" @click="cancelForm">{{ editingId ? 'Đóng' : 'Hủy' }}</BaseButton>
      </div>

      <!-- Chỉ hiện khi đã có book_id (sách vừa tạo xong hoặc đang sửa sách có sẵn) -->
      <div v-if="editingId" class="mt-5 border-t border-border pt-4">
        <h4 class="font-display text-base font-semibold">Quản lý ảnh</h4>

        <div class="mt-2 flex flex-wrap gap-3">
          <div v-for="img in bookImages" :key="img.id" class="relative w-[100px]">
            <img :src="img.image_url" alt="Ảnh sách" class="h-[100px] w-[100px] rounded-lg border border-border object-cover" />
            <span v-if="img.is_primary" class="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] text-white">
              Đại diện
            </span>
            <div class="mt-1 flex flex-col gap-1">
              <button v-if="!img.is_primary" type="button" class="text-[11px] text-primary hover:underline" @click="handleSetPrimary(img)">
                Đặt làm đại diện
              </button>
              <button type="button" class="text-[11px] text-danger hover:underline" @click="askDeleteImage(img)">Xóa</button>
            </div>
          </div>
          <p v-if="bookImages.length === 0" class="text-sm text-text-secondary">Sách chưa có ảnh nào.</p>
        </div>

        <div class="mt-3 flex flex-col items-start gap-2">
          <input ref="fileInputRef" type="file" accept="image/*" multiple class="text-sm" @change="onFilesSelected" />
          <BaseButton
            size="sm"
            variant="secondary"
            type="button"
            :loading="imageUploading"
            :disabled="selectedFiles.length === 0"
            @click="uploadSelectedImages"
          >
            {{ imageUploading ? 'Đang tải lên...' : 'Tải lên' }}
          </BaseButton>
          <small class="text-text-secondary">Tối đa 5 ảnh/lần, mỗi ảnh ≤ 5MB, định dạng JPG/PNG/WEBP.</small>
          <p v-if="imageError" class="text-sm text-danger">{{ imageError }}</p>
        </div>
      </div>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>
    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-lg bg-surface shadow-sm">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-3 py-2 text-left">Ảnh</th>
              <th class="px-3 py-2 text-left">ID</th>
              <th class="px-3 py-2 text-left">Tên sách</th>
              <th class="px-3 py-2 text-left">Tác giả</th>
              <th class="px-3 py-2 text-left">NXB</th>
              <th class="px-3 py-2 text-left">Danh mục</th>
              <th class="px-3 py-2 text-left">Giá</th>
              <th class="px-3 py-2 text-left">Tồn kho</th>
              <th class="px-3 py-2 text-left">Trạng thái</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="book in books"
              :key="book.id"
              class="border-b border-border hover:bg-background"
              :class="{ 'opacity-50': !book.is_active }"
            >
              <td class="px-3 py-2">
                <img class="h-[56px] w-[40px] rounded object-cover" :src="book.primary_image_url || PLACEHOLDER_IMAGE" :alt="book.title" />
              </td>
              <td class="px-3 py-2">{{ book.id }}</td>
              <td class="px-3 py-2">{{ book.title }}</td>
              <td class="px-3 py-2">{{ book.author?.name }}</td>
              <td class="px-3 py-2">{{ book.publisher?.name }}</td>
              <td class="px-3 py-2">{{ book.category?.name }}</td>
              <td class="px-3 py-2">{{ formatPrice(book.price) }}</td>
              <td class="px-3 py-2">{{ book.stock_quantity }}</td>
              <td class="px-3 py-2">{{ book.is_active ? 'Đang bán' : 'Đã ẩn' }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-3">
                  <button type="button" class="text-primary hover:underline" @click="openEditForm(book)">Sửa</button>
                  <button v-if="book.is_active" type="button" class="text-danger hover:underline" @click="askHide(book)">Ẩn</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="books.length === 0" icon="📖" title="Không tìm thấy sách nào" />
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <ConfirmDialog
      :show="confirmHide.show"
      title="Ẩn sách"
      :message="`Ẩn sách “${confirmHide.book?.title}” khỏi cửa hàng?`"
      confirm-label="Ẩn"
      @confirm="confirmHideBook"
      @cancel="confirmHide.show = false"
    />
    <ConfirmDialog
      :show="confirmDeleteImage.show"
      title="Xóa ảnh"
      message="Xóa ảnh này khỏi sách?"
      confirm-label="Xóa"
      @confirm="confirmDeleteImageAction"
      @cancel="confirmDeleteImage.show = false"
    />
  </div>
</template>
