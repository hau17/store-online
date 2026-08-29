<script setup>
// Quản lý danh mục: bảng danh sách (tìm kiếm + phân trang) + form thêm/sửa (inline) + xóa có confirm.
import { ref, onMounted } from 'vue';
import categoryService from '../../services/category.service';
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import BaseButton from '../../components/common/BaseButton.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';

const { showToast } = useToast();

const categories = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

const keyword = ref('');
let debounceTimer = null;

const showForm = ref(false);
const editingId = ref(null); // null = đang thêm mới, có giá trị = đang sửa category đó
const form = ref({ name: '', slug: '', description: '' });
const formError = ref('');
const submitting = ref(false);

const confirmDelete = ref({ show: false, category: null });

async function fetchCategories(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await categoryService.getCategories({ keyword: keyword.value || undefined, page, limit: 10 });
    categories.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách danh mục';
  } finally {
    loading.value = false;
  }
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchCategories(1), 400);
}

function goToPage(page) {
  fetchCategories(page);
}

// Bỏ dấu tiếng Việt + chuyển thành dạng slug (vd "Tiểu thuyết" -> "tieu-thuyet").
// normalize('NFD') tách chữ có dấu thành [chữ cái gốc] + [ký tự dấu riêng, mã Unicode U+0300-U+036F],
// sau đó regex xóa hết dải mã đó đi là còn lại chữ không dấu.
const DIACRITIC_MARKS_REGEX = new RegExp('[̀-ͯ]', 'g');

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(DIACRITIC_MARKS_REGEX, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Chỉ tự động điền slug khi người dùng chưa tự sửa slug tay (tránh ghi đè slug họ đã chỉnh)
let slugTouchedByUser = false;
function onNameInput() {
  if (!slugTouchedByUser) {
    form.value.slug = slugify(form.value.name);
  }
}
function onSlugInput() {
  slugTouchedByUser = true;
}

function openCreateForm() {
  editingId.value = null;
  form.value = { name: '', slug: '', description: '' };
  slugTouchedByUser = false;
  formError.value = '';
  showForm.value = true;
}

function openEditForm(cat) {
  editingId.value = cat.id;
  form.value = { name: cat.name, slug: cat.slug, description: cat.description || '' };
  slugTouchedByUser = true; // sửa category có sẵn -> không tự động ghi đè slug đang có
  formError.value = '';
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
}

async function submitForm() {
  if (!form.value.name.trim()) {
    formError.value = 'Tên danh mục không được để trống';
    return;
  }
  if (!form.value.slug.trim()) {
    formError.value = 'Slug không được để trống';
    return;
  }

  submitting.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      await categoryService.updateCategory(editingId.value, form.value);
      showToast('Cập nhật danh mục thành công');
    } else {
      await categoryService.createCategory(form.value);
      showToast('Thêm danh mục thành công');
    }
    showForm.value = false;
    await fetchCategories(pagination.value.page);
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu danh mục thất bại';
  } finally {
    submitting.value = false;
  }
}

function askDelete(cat) {
  confirmDelete.value = { show: true, category: cat };
}

async function confirmDeleteCategory() {
  const cat = confirmDelete.value.category;
  confirmDelete.value = { show: false, category: null };
  errorMessage.value = '';
  try {
    await categoryService.deleteCategory(cat.id);
    showToast('Đã xóa danh mục');
    await fetchCategories(pagination.value.page);
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 CATEGORY_HAS_BOOKS (danh mục còn sách, không cho xóa)
    errorMessage.value = err.response?.data?.message || 'Xóa danh mục thất bại';
  }
}

onMounted(() => fetchCategories(1));
</script>

<template>
  <div>
    <h1>Quản lý danh mục</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <input
        v-model="keyword"
        type="text"
        placeholder="Tìm theo tên danh mục..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
      <BaseButton @click="openCreateForm">+ Thêm danh mục</BaseButton>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>

    <div v-if="showForm" class="mt-4 max-w-md rounded-lg bg-surface p-5 shadow-sm">
      <h3>{{ editingId ? 'Sửa danh mục' : 'Thêm danh mục' }}</h3>
      <div class="mt-3 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tên</label>
          <input
            v-model="form.name"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @input="onNameInput"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Slug</label>
          <input
            v-model="form.slug"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @input="onSlugInput"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Mô tả</label>
          <textarea
            v-model="form.description"
            rows="2"
            class="rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          ></textarea>
        </div>
      </div>
      <p v-if="formError" class="mt-3 text-sm text-danger">{{ formError }}</p>
      <div class="mt-4 flex gap-2">
        <BaseButton :loading="submitting" @click="submitForm">{{ submitting ? 'Đang lưu...' : 'Lưu' }}</BaseButton>
        <BaseButton variant="secondary" type="button" @click="cancelForm">Hủy</BaseButton>
      </div>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>
    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-lg bg-surface shadow-sm">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-background text-xs uppercase text-text-secondary">
              <th class="px-3 py-2 text-left">ID</th>
              <th class="px-3 py-2 text-left">Tên</th>
              <th class="px-3 py-2 text-left">Slug</th>
              <th class="px-3 py-2 text-left">Mô tả</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id" class="border-b border-border hover:bg-background">
              <td class="px-3 py-2">{{ cat.id }}</td>
              <td class="px-3 py-2">{{ cat.name }}</td>
              <td class="px-3 py-2">{{ cat.slug }}</td>
              <td class="px-3 py-2">{{ cat.description }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-3">
                  <button type="button" class="text-primary hover:underline" @click="openEditForm(cat)">Sửa</button>
                  <button type="button" class="text-danger hover:underline" @click="askDelete(cat)">Xóa</button>
                </div>
              </td>
            </tr>
            <tr v-if="categories.length === 0">
              <td colspan="5" class="px-3 py-6 text-center text-text-secondary">Không tìm thấy danh mục nào.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <ConfirmDialog
      :show="confirmDelete.show"
      title="Xóa danh mục"
      :message="`Xóa danh mục “${confirmDelete.category?.name}”?`"
      confirm-label="Xóa"
      @confirm="confirmDeleteCategory"
      @cancel="confirmDelete.show = false"
    />
  </div>
</template>
