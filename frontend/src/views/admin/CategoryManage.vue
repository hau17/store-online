<script setup>
// Quản lý danh mục: bảng danh sách + form thêm/sửa (inline, không dùng modal cho đơn giản) + xóa có confirm.
import { ref, onMounted } from 'vue';
import categoryService from '../../services/category.service';

const categories = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const showForm = ref(false);
const editingId = ref(null); // null = đang thêm mới, có giá trị = đang sửa category đó
const form = ref({ name: '', slug: '', description: '' });
const formError = ref('');
const submitting = ref(false);

async function fetchCategories() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await categoryService.getCategories();
    categories.value = res.data.data.items;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách danh mục';
  } finally {
    loading.value = false;
  }
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
    } else {
      await categoryService.createCategory(form.value);
    }
    showForm.value = false;
    await fetchCategories();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu danh mục thất bại';
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(cat) {
  if (!confirm(`Xóa danh mục "${cat.name}"?`)) return;
  errorMessage.value = '';
  try {
    await categoryService.deleteCategory(cat.id);
    await fetchCategories();
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 CATEGORY_HAS_BOOKS (danh mục còn sách, không cho xóa)
    errorMessage.value = err.response?.data?.message || 'Xóa danh mục thất bại';
  }
}

onMounted(fetchCategories);
</script>

<template>
  <div class="category-manage">
    <h1>Quản lý danh mục</h1>

    <button @click="openCreateForm">+ Thêm danh mục</button>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="showForm" class="form-box">
      <h3>{{ editingId ? 'Sửa danh mục' : 'Thêm danh mục' }}</h3>
      <div class="form-group">
        <label>Tên</label>
        <input v-model="form.name" type="text" @input="onNameInput" />
      </div>
      <div class="form-group">
        <label>Slug</label>
        <input v-model="form.slug" type="text" @input="onSlugInput" />
      </div>
      <div class="form-group">
        <label>Mô tả</label>
        <textarea v-model="form.description" rows="2"></textarea>
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
          <th>Slug</th>
          <th>Mô tả</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cat in categories" :key="cat.id">
          <td>{{ cat.id }}</td>
          <td>{{ cat.name }}</td>
          <td>{{ cat.slug }}</td>
          <td>{{ cat.description }}</td>
          <td>
            <button @click="openEditForm(cat)">Sửa</button>
            <button @click="handleDelete(cat)">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.category-manage {
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
