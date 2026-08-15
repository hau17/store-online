<script setup>
// Quản lý tác giả: cùng khuôn mẫu với CategoryManage.vue.
import { ref, onMounted } from 'vue';
import authorService from '../../services/author.service';

const authors = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const showForm = ref(false);
const editingId = ref(null);
const form = ref({ name: '', bio: '' });
const formError = ref('');
const submitting = ref(false);

async function fetchAuthors() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await authorService.getAuthors();
    authors.value = res.data.data.items;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách tác giả';
  } finally {
    loading.value = false;
  }
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
    } else {
      await authorService.createAuthor(form.value);
    }
    showForm.value = false;
    await fetchAuthors();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu tác giả thất bại';
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(author) {
  if (!confirm(`Xóa tác giả "${author.name}"?`)) return;
  errorMessage.value = '';
  try {
    await authorService.deleteAuthor(author.id);
    await fetchAuthors();
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 AUTHOR_HAS_BOOKS (còn sách của tác giả này, không cho xóa)
    errorMessage.value = err.response?.data?.message || 'Xóa tác giả thất bại';
  }
}

onMounted(fetchAuthors);
</script>

<template>
  <div class="author-manage">
    <h1>Quản lý tác giả</h1>

    <button @click="openCreateForm">+ Thêm tác giả</button>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="showForm" class="form-box">
      <h3>{{ editingId ? 'Sửa tác giả' : 'Thêm tác giả' }}</h3>
      <div class="form-group">
        <label>Tên</label>
        <input v-model="form.name" type="text" />
      </div>
      <div class="form-group">
        <label>Tiểu sử</label>
        <textarea v-model="form.bio" rows="2"></textarea>
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
          <th>Tiểu sử</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="author in authors" :key="author.id">
          <td>{{ author.id }}</td>
          <td>{{ author.name }}</td>
          <td>{{ author.bio }}</td>
          <td>
            <button @click="openEditForm(author)">Sửa</button>
            <button @click="handleDelete(author)">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.author-manage {
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
