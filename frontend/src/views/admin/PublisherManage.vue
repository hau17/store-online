<script setup>
// Quản lý nhà xuất bản: cùng khuôn mẫu với CategoryManage.vue.
import { ref, onMounted } from 'vue';
import publisherService from '../../services/publisher.service';

const publishers = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const showForm = ref(false);
const editingId = ref(null);
const form = ref({ name: '', address: '' });
const formError = ref('');
const submitting = ref(false);

async function fetchPublishers() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await publisherService.getPublishers();
    publishers.value = res.data.data.items;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách nhà xuất bản';
  } finally {
    loading.value = false;
  }
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
    } else {
      await publisherService.createPublisher(form.value);
    }
    showForm.value = false;
    await fetchPublishers();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu nhà xuất bản thất bại';
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(publisher) {
  if (!confirm(`Xóa nhà xuất bản "${publisher.name}"?`)) return;
  errorMessage.value = '';
  try {
    await publisherService.deletePublisher(publisher.id);
    await fetchPublishers();
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 PUBLISHER_HAS_BOOKS
    errorMessage.value = err.response?.data?.message || 'Xóa nhà xuất bản thất bại';
  }
}

onMounted(fetchPublishers);
</script>

<template>
  <div class="publisher-manage">
    <h1>Quản lý nhà xuất bản</h1>

    <button @click="openCreateForm">+ Thêm nhà xuất bản</button>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="showForm" class="form-box">
      <h3>{{ editingId ? 'Sửa nhà xuất bản' : 'Thêm nhà xuất bản' }}</h3>
      <div class="form-group">
        <label>Tên</label>
        <input v-model="form.name" type="text" />
      </div>
      <div class="form-group">
        <label>Địa chỉ</label>
        <input v-model="form.address" type="text" />
      </div>
      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <button :disabled="submitting" @click="submitForm">{{ submitting ? 'Đang lưu...' : 'Lưu' }}</button>
        <button type="button" @click="cancelForm">Hủy</button>
      </div>
    </div>

    <p v-if="loading">Đang tải...</p>
    <table v-else>
      <thead>
        <tr>
          <th>ID</th>
          <th>Tên</th>
          <th>Địa chỉ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="publisher in publishers" :key="publisher.id">
          <td>{{ publisher.id }}</td>
          <td>{{ publisher.name }}</td>
          <td>{{ publisher.address }}</td>
          <td>
            <button @click="openEditForm(publisher)">Sửa</button>
            <button @click="handleDelete(publisher)">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.publisher-manage {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}
.form-box {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
  max-width: 400px;
}
.form-group {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-actions {
  display: flex;
  gap: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}
th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  font-size: 14px;
}
button {
  cursor: pointer;
  margin-right: 4px;
}
.error {
  color: #d33;
}
</style>
