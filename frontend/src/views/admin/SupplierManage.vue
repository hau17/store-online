<script setup>
// Quản lý nhà cung cấp: cùng khuôn mẫu với CategoryManage.vue. Toàn bộ API này chỉ admin gọi được.
import { ref, onMounted } from 'vue';
import supplierService from '../../services/supplier.service';

const suppliers = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const showForm = ref(false);
const editingId = ref(null);
const form = ref({ name: '', phone: '', email: '', address: '' });
const formError = ref('');
const submitting = ref(false);

async function fetchSuppliers() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await supplierService.getSuppliers();
    suppliers.value = res.data.data.items;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được danh sách nhà cung cấp';
  } finally {
    loading.value = false;
  }
}

function openCreateForm() {
  editingId.value = null;
  form.value = { name: '', phone: '', email: '', address: '' };
  formError.value = '';
  showForm.value = true;
}

function openEditForm(supplier) {
  editingId.value = supplier.id;
  form.value = {
    name: supplier.name,
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || '',
  };
  formError.value = '';
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
}

async function submitForm() {
  if (!form.value.name.trim()) {
    formError.value = 'Tên nhà cung cấp không được để trống';
    return;
  }

  submitting.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      await supplierService.updateSupplier(editingId.value, form.value);
    } else {
      await supplierService.createSupplier(form.value);
    }
    showForm.value = false;
    await fetchSuppliers();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Lưu nhà cung cấp thất bại';
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(supplier) {
  if (!confirm(`Xóa nhà cung cấp "${supplier.name}"?`)) return;
  errorMessage.value = '';
  try {
    await supplierService.deleteSupplier(supplier.id);
    await fetchSuppliers();
  } catch (err) {
    // Trường hợp phổ biến nhất: 409 SUPPLIER_HAS_IMPORTS (còn phiếu nhập tham chiếu, không cho xóa)
    errorMessage.value = err.response?.data?.message || 'Xóa nhà cung cấp thất bại';
  }
}

onMounted(fetchSuppliers);
</script>

<template>
  <div class="supplier-manage">
    <h1>Quản lý nhà cung cấp</h1>

    <button @click="openCreateForm">+ Thêm nhà cung cấp</button>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="showForm" class="form-box">
      <h3>{{ editingId ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp' }}</h3>
      <div class="form-group">
        <label>Tên</label>
        <input v-model="form.name" type="text" />
      </div>
      <div class="form-group">
        <label>Số điện thoại</label>
        <input v-model="form.phone" type="text" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input v-model="form.email" type="email" />
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
          <th>SĐT</th>
          <th>Email</th>
          <th>Địa chỉ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="supplier in suppliers" :key="supplier.id">
          <td>{{ supplier.id }}</td>
          <td>{{ supplier.name }}</td>
          <td>{{ supplier.phone }}</td>
          <td>{{ supplier.email }}</td>
          <td>{{ supplier.address }}</td>
          <td>
            <button @click="openEditForm(supplier)">Sửa</button>
            <button @click="handleDelete(supplier)">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.supplier-manage {
  max-width: 900px;
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
