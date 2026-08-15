<script setup>
// Trang chủ: danh sách sách dạng lưới, tìm kiếm theo tên (debounce), lọc theo category, phân trang.
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import bookService from '../../services/book.service';
import categoryService from '../../services/category.service';

const router = useRouter();

const books = ref([]);
const categories = ref([]);
const keyword = ref('');
const categoryId = ref('');
const pagination = ref({ page: 1, limit: 12, total: 0, total_pages: 0 });
const loading = ref(false);
const errorMessage = ref('');

let debounceTimer = null; // id của setTimeout đang chờ, dùng để hủy lần gõ trước đó

async function fetchBooks(page = 1) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await bookService.getBooks({
      keyword: keyword.value || undefined,
      category_id: categoryId.value || undefined,
      page,
      limit: 12,
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
    // Lỗi tải category không quan trọng bằng lỗi tải sách -> chỉ log, không chặn hiển thị trang
    console.error('Không tải được danh mục:', err);
  }
}

// Mỗi lần gõ vào ô tìm kiếm, hủy timer cũ và đặt timer mới 400ms.
// Chỉ khi người dùng ngừng gõ đủ 400ms thì mới thật sự gọi API — tránh gọi API dồn dập theo từng phím gõ.
function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchBooks(1); // tìm kiếm mới -> luôn quay về trang 1
  }, 400);
}

function onCategoryChange() {
  fetchBooks(1);
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.total_pages) return;
  fetchBooks(page);
}

function goToDetail(bookId) {
  router.push(`/books/${bookId}`);
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

onMounted(() => {
  fetchCategories();
  fetchBooks(1);
});
</script>

<template>
  <div class="home-page">
    <h1>Danh sách sách</h1>

    <div class="filters">
      <input
        v-model="keyword"
        type="text"
        placeholder="Tìm theo tên sách hoặc tác giả..."
        @input="onKeywordInput"
      />

      <select v-model="categoryId" @change="onCategoryChange">
        <option value="">Tất cả danh mục</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-else-if="loading">Đang tải...</p>
    <p v-else-if="books.length === 0">Không tìm thấy sách nào.</p>

    <div v-else class="book-grid">
      <div v-for="book in books" :key="book.id" class="book-card" @click="goToDetail(book.id)">
        <img :src="book.primary_image_url || 'https://placehold.co/200x280?text=No+Image'" :alt="book.title" />
        <h3>{{ book.title }}</h3>
        <p class="author">{{ book.author?.name }}</p>
        <p class="price">{{ formatPrice(book.price) }}</p>
      </div>
    </div>

    <div v-if="pagination.total_pages > 1" class="pagination">
      <button :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
      <span>Trang {{ pagination.page }} / {{ pagination.total_pages }}</span>
      <button :disabled="pagination.page >= pagination.total_pages" @click="goToPage(pagination.page + 1)">
        Sau
      </button>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px;
}
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.filters input {
  flex: 1;
  padding: 8px;
}
.filters select {
  padding: 8px;
}
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
.book-card {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  text-align: center;
}
.book-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.book-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 4px;
}
.book-card h3 {
  font-size: 14px;
  margin: 8px 0 4px;
}
.author {
  font-size: 12px;
  color: #666;
}
.price {
  font-weight: bold;
  color: #d33;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}
.error {
  color: #d33;
}
</style>
