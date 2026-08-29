<script setup>
// Trang chủ: danh sách sách dạng lưới, tìm kiếm theo tên (debounce), lọc theo category, phân trang.
// keyword có thể được seed sẵn từ ô tìm kiếm ở header (CustomerLayout.vue) qua query string.
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import bookService from '../../services/book.service';
import categoryService from '../../services/category.service';
import Pagination from '../../components/common/Pagination.vue';
import EmptyState from '../../components/common/EmptyState.vue';

const route = useRoute();
const router = useRouter();

const books = ref([]);
const categories = ref([]);
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '');
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
    // limit cao để lấy hết danh mục cho dropdown lọc (API giờ có phân trang, mặc định chỉ 10 dòng)
    const res = await categoryService.getCategories({ limit: 100 });
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

function clearSearch() {
  keyword.value = '';
  categoryId.value = '';
  fetchBooks(1);
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
  <div class="mx-auto max-w-6xl px-4 py-8">
    <h1>Danh sách sách</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <input
        v-model="keyword"
        type="text"
        placeholder="Tìm theo tên sách hoặc tác giả..."
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
    </div>

    <p v-if="errorMessage" class="mt-6 text-sm text-danger">{{ errorMessage }}</p>
    <p v-else-if="loading" class="mt-6 text-sm text-text-secondary">Đang tải...</p>

    <EmptyState
      v-else-if="books.length === 0"
      class="mt-6"
      icon="🔍"
      title="Không tìm thấy sách nào"
      description="Thử đổi từ khóa hoặc chọn danh mục khác."
      action-label="Xóa bộ lọc"
      @action="clearSearch"
    />

    <div v-else class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      <div
        v-for="book in books"
        :key="book.id"
        class="cursor-pointer rounded-lg bg-surface p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        tabindex="0"
        role="button"
        @click="goToDetail(book.id)"
        @keyup.enter="goToDetail(book.id)"
      >
        <img
          :src="book.primary_image_url || 'https://placehold.co/200x280?text=No+Image'"
          :alt="book.title"
          class="aspect-[3/4] w-full rounded-lg object-cover"
        />
        <h3 class="mt-2 line-clamp-2 text-sm font-semibold">{{ book.title }}</h3>
        <p class="mt-1 text-xs text-text-secondary">{{ book.author?.name }}</p>
        <p class="mt-1 font-semibold text-accent">{{ formatPrice(book.price) }}</p>
      </div>
    </div>

    <Pagination :current-page="pagination.page" :total-pages="pagination.total_pages" @change-page="goToPage" />
  </div>
</template>
