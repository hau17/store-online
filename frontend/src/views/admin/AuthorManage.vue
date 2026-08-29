<script setup>
// Quản lý tác giả: cùng khuôn mẫu với CategoryManage.vue (tìm kiếm + phân trang).
import { ref, onMounted } from 'vue';
import authorService from '../../services/author.service';
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import BaseButton from '../../components/common/BaseButton.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';

const { showToast } = useToast();

const authors = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

const keyword = ref('');
let debounceTimer = null;

const showForm = ref(false);
const editingId = ref(null);
const form = ref({ name: '', bio: '' });
const formError = ref('');
const submitting = ref(false);

const confirmDelete = ref({ show: false, author: null });

async function fetchAuthors(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await authorService.getAuthors({ keyword: keyword.value || undefined, page, limit: 10 });
    authors.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách tác giả';
  } finally {
    loading.value = false;
  }
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchAuthors(1), 400);
}

function goToPage(page) {
  fetchAuthors(page);
}

function openCreateForm() {
  editingId.value = null;
  form.value = { name: '', bio: '' };
  formError.value = '';
  showForm.value = true;
}

function openEditForm(author) {
  editingId.value = author.id;
  form.value = { name: author.name, bio: author.bio || '' };
  formError.value = '';
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
}

async function submitForm() {
  if (!form.value.name.trim()) {
    formError.value = 'Tên tác giả không được để trống';
    return;
  }

  submitting.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      await authorService.updateAuthor(editingId.value, form.value);
      showToast('Cập nhật tác giả thành công');
    } else {
      await authorService.createAuthor(form.value);
      showToast('Thêm tác giả thành công');
    }
    showForm.value = false;
    await fetchAuthors(pagination.value.page);
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu tác giả thất bại';
  } finally {
    submitting.value = false;
  }
}

function askDelete(author) {
  confirmDelete.value = { show: true, author };
}

async function confirmDeleteAuthor() {
  const author = confirmDelete.value.author;
  confirmDelete.value = { show: false, author: null };
  errorMessage.value = '';
  try {
    await authorService.deleteAuthor(author.id);
    showToast('Đã xóa tác giả');
    await fetchAuthors(pagination.value.page);
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 AUTHOR_HAS_BOOKS (còn sách của tác giả này, không cho xóa)
    errorMessage.value = err.response?.data?.message || 'Xóa tác giả thất bại';
  }
}

onMounted(() => fetchAuthors(1));
</script>

<template>
  <div>
    <h1>Quản lý tác giả</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <input
        v-model="keyword"
        type="text"
        placeholder="Tìm theo tên tác giả..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
      <BaseButton @click="openCreateForm">+ Thêm tác giả</BaseButton>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>

    <div v-if="showForm" class="mt-4 max-w-md rounded-lg bg-surface p-5 shadow-sm">
      <h3>{{ editingId ? 'Sửa tác giả' : 'Thêm tác giả' }}</h3>
      <div class="mt-3 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tên</label>
          <input
            v-model="form.name"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tiểu sử</label>
          <textarea
            v-model="form.bio"
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
              <th class="px-3 py-2 text-left">Tiểu sử</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="author in authors" :key="author.id" class="border-b border-border hover:bg-background">
              <td class="px-3 py-2">{{ author.id }}</td>
              <td class="px-3 py-2">{{ author.name }}</td>
              <td class="px-3 py-2">{{ author.bio }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-3">
                  <button type="button" class="text-primary hover:underline" @click="openEditForm(author)">Sửa</button>
                  <button type="button" class="text-danger hover:underline" @click="askDelete(author)">Xóa</button>
                </div>
              </td>
            </tr>
            <tr v-if="authors.length === 0">
              <td colspan="4" class="px-3 py-6 text-center text-text-secondary">Không tìm thấy tác giả nào.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <ConfirmDialog
      :show="confirmDelete.show"
      title="Xóa tác giả"
      :message="`Xóa tác giả “${confirmDelete.author?.name}”?`"
      confirm-label="Xóa"
      @confirm="confirmDeleteAuthor"
      @cancel="confirmDelete.show = false"
    />
  </div>
</template>
