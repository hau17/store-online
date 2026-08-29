<script setup>
// Quản lý nhà xuất bản: cùng khuôn mẫu với CategoryManage.vue (tìm kiếm + phân trang).
import { ref, onMounted } from 'vue';
import publisherService from '../../services/publisher.service';
import { useToast } from '../../composables/useToast';
import Pagination from '../../components/common/Pagination.vue';
import BaseButton from '../../components/common/BaseButton.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';

const { showToast } = useToast();

const publishers = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, total_pages: 0 });
const loading = ref(true);
const errorMessage = ref('');

const keyword = ref('');
let debounceTimer = null;

const showForm = ref(false);
const editingId = ref(null);
const form = ref({ name: '', address: '' });
const formError = ref('');
const submitting = ref(false);

const confirmDelete = ref({ show: false, publisher: null });

async function fetchPublishers(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await publisherService.getPublishers({ keyword: keyword.value || undefined, page, limit: 10 });
    publishers.value = res.data.data.items;
    pagination.value = res.data.data.pagination;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách nhà xuất bản';
  } finally {
    loading.value = false;
  }
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchPublishers(1), 400);
}

function goToPage(page) {
  fetchPublishers(page);
}

function openCreateForm() {
  editingId.value = null;
  form.value = { name: '', address: '' };
  formError.value = '';
  showForm.value = true;
}

function openEditForm(publisher) {
  editingId.value = publisher.id;
  form.value = { name: publisher.name, address: publisher.address || '' };
  formError.value = '';
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
}

async function submitForm() {
  if (!form.value.name.trim()) {
    formError.value = 'Tên nhà xuất bản không được để trống';
    return;
  }

  submitting.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      await publisherService.updatePublisher(editingId.value, form.value);
      showToast('Cập nhật nhà xuất bản thành công');
    } else {
      await publisherService.createPublisher(form.value);
      showToast('Thêm nhà xuất bản thành công');
    }
    showForm.value = false;
    await fetchPublishers(pagination.value.page);
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu nhà xuất bản thất bại';
  } finally {
    submitting.value = false;
  }
}

function askDelete(publisher) {
  confirmDelete.value = { show: true, publisher };
}

async function confirmDeletePublisher() {
  const publisher = confirmDelete.value.publisher;
  confirmDelete.value = { show: false, publisher: null };
  errorMessage.value = '';
  try {
    await publisherService.deletePublisher(publisher.id);
    showToast('Đã xóa nhà xuất bản');
    await fetchPublishers(pagination.value.page);
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 PUBLISHER_HAS_BOOKS
    errorMessage.value = err.response?.data?.message || 'Xóa nhà xuất bản thất bại';
  }
}

onMounted(() => fetchPublishers(1));
</script>

<template>
  <div>
    <h1>Quản lý nhà xuất bản</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <input
        v-model="keyword"
        type="text"
        placeholder="Tìm theo tên nhà xuất bản..."
        class="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @input="onKeywordInput"
      />
      <BaseButton @click="openCreateForm">+ Thêm nhà xuất bản</BaseButton>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>

    <div v-if="showForm" class="mt-4 max-w-md rounded-lg bg-surface p-5 shadow-sm">
      <h3>{{ editingId ? 'Sửa nhà xuất bản' : 'Thêm nhà xuất bản' }}</h3>
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
          <label class="text-sm font-medium text-text-primary">Địa chỉ</label>
          <input
            v-model="form.address"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
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
              <th class="px-3 py-2 text-left">Địa chỉ</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="publisher in publishers" :key="publisher.id" class="border-b border-border hover:bg-background">
              <td class="px-3 py-2">{{ publisher.id }}</td>
              <td class="px-3 py-2">{{ publisher.name }}</td>
              <td class="px-3 py-2">{{ publisher.address }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-3">
                  <button type="button" class="text-primary hover:underline" @click="openEditForm(publisher)">Sửa</button>
                  <button type="button" class="text-danger hover:underline" @click="askDelete(publisher)">Xóa</button>
                </div>
              </td>
            </tr>
            <tr v-if="publishers.length === 0">
              <td colspan="4" class="px-3 py-6 text-center text-text-secondary">Không tìm thấy nhà xuất bản nào.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
    </template>

    <ConfirmDialog
      :show="confirmDelete.show"
      title="Xóa nhà xuất bản"
      :message="`Xóa nhà xuất bản “${confirmDelete.publisher?.name}”?`"
      confirm-label="Xóa"
      @confirm="confirmDeletePublisher"
      @cancel="confirmDelete.show = false"
    />
  </div>
</template>
