<script setup>
// Chi tiết 1 cuốn sách. Nút "Thêm vào giỏ" tạm thời chỉ alert() — nối vào cart store thật sẽ làm ở bước sau.
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import bookService from '../../services/book.service';

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x420?text=No+Image';

const route = useRoute();

const book = ref(null);
const quantity = ref(1);
const loading = ref(true);
const errorMessage = ref('');
const selectedImageUrl = ref(''); // ảnh đang hiển thị to ở gallery, đổi khi bấm vào thumbnail

async function fetchBook() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await bookService.getBookById(route.params.id);
    book.value = res.data.data;

    // Ảnh mặc định hiển thị: ảnh có is_primary = true, nếu chưa ảnh nào được đánh dấu primary
    // thì lấy tạm ảnh đầu tiên trong mảng, còn nếu sách chưa có ảnh nào thì để rỗng (dùng placeholder).
    const images = book.value.images || [];
    const primary = images.find((img) => img.is_primary);
    selectedImageUrl.value = primary?.image_url || images[0]?.image_url || '';
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tìm thấy sách';
  } finally {
    loading.value = false;
  }
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

function addToCart() {
  // TODO: nối vào cart store thật ở bước code module Cart
  alert(`Đã thêm ${quantity.value} cuốn "${book.value.title}" vào giỏ (demo, chưa lưu thật)`);
}

onMounted(fetchBook);
</script>

<template>
  <div class="detail-page">
    <p v-if="loading">Đang tải...</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-else-if="book" class="detail-content">
      <div class="gallery">
        <img class="main-image" :src="selectedImageUrl || PLACEHOLDER_IMAGE" :alt="book.title" />

        <div v-if="book.images && book.images.length > 1" class="thumbnails">
          <img
            v-for="img in book.images"
            :key="img.id"
            :src="img.image_url"
            :class="{ active: img.image_url === selectedImageUrl }"
            @click="selectedImageUrl = img.image_url"
          />
        </div>
      </div>

      <div class="info">
        <h1>{{ book.title }}</h1>
        <p><strong>Tác giả:</strong> {{ book.author?.name || 'Đang cập nhật' }}</p>
        <p><strong>Nhà xuất bản:</strong> {{ book.publisher?.name || 'Đang cập nhật' }}</p>
        <p><strong>Danh mục:</strong> {{ book.category?.name }}</p>
        <p class="price">{{ formatPrice(book.price) }}</p>
        <p><strong>Tồn kho:</strong> {{ book.stock_quantity }}</p>
        <p class="description">{{ book.description || 'Chưa có mô tả' }}</p>

        <div class="add-to-cart">
          <input
            v-model.number="quantity"
            type="number"
            min="1"
            :max="book.stock_quantity"
          />
          <button :disabled="book.stock_quantity <= 0" @click="addToCart">
            {{ book.stock_quantity <= 0 ? 'Hết hàng' : 'Thêm vào giỏ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}
.detail-content {
  display: flex;
  gap: 24px;
}
.gallery {
  width: 260px;
}
.main-image {
  width: 260px;
  height: 360px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.thumbnails {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  overflow-x: auto;
}
.thumbnails img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.7;
}
.thumbnails img:hover {
  opacity: 1;
}
.thumbnails img.active {
  border-color: #d33;
  opacity: 1;
}
.info {
  flex: 1;
}
.price {
  font-size: 20px;
  font-weight: bold;
  color: #d33;
}
.description {
  white-space: pre-line;
  color: #444;
}
.add-to-cart {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.add-to-cart input {
  width: 60px;
  padding: 6px;
}
.add-to-cart button {
  padding: 8px 16px;
  cursor: pointer;
}
.error {
  color: #d33;
}
</style>
