<script setup>
// Chi tiết 1 cuốn sách. Nút "Thêm vào giỏ" nối vào cart.store.addItem() thật (mục 6.6).
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import bookService from '../../services/book.service';
import { useCartStore } from '../../stores/cart.store';
import { useAuthStore } from '../../stores/auth.store';
import BaseButton from '../../components/common/BaseButton.vue';

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x420?text=No+Image';

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();

const book = ref(null);
const quantity = ref(1);
const loading = ref(true);
const errorMessage = ref('');
const selectedImageUrl = ref(''); // ảnh đang hiển thị to ở gallery, đổi khi bấm vào thumbnail
const addingToCart = ref(false);
const cartMessage = ref('');
const cartMessageIsError = ref(false);

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

async function addToCart() {
  // Chưa đăng nhập -> đưa sang trang login luôn thay vì để API trả lỗi 401 khó hiểu
  if (!authStore.isLoggedIn) {
    router.push('/login');
    return;
  }

  addingToCart.value = true;
  cartMessage.value = '';
  const result = await cartStore.addItem(book.value.id, quantity.value);
  if (result.success) {
    cartMessageIsError.value = false;
    cartMessage.value = `Đã thêm ${quantity.value} cuốn "${book.value.title}" vào giỏ hàng`;
  } else {
    cartMessageIsError.value = true;
    cartMessage.value = result.message;
  }
  addingToCart.value = false;
  setTimeout(() => (cartMessage.value = ''), 4000);
}

onMounted(fetchBook);
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <p v-if="loading" class="text-text-secondary">Đang tải...</p>
    <p v-else-if="errorMessage" class="text-danger">{{ errorMessage }}</p>

    <div v-else-if="book" class="flex flex-col gap-6 md:flex-row">
      <div class="shrink-0 md:w-64">
        <img
          class="aspect-[3/4] w-full rounded-lg border border-border object-cover"
          :src="selectedImageUrl || PLACEHOLDER_IMAGE"
          :alt="book.title"
        />

        <div v-if="book.images && book.images.length > 1" class="mt-2 flex gap-2 overflow-x-auto">
          <img
            v-for="img in book.images"
            :key="img.id"
            :src="img.image_url"
            :alt="book.title"
            class="h-14 w-14 shrink-0 cursor-pointer rounded-lg border-2 object-cover opacity-70 hover:opacity-100"
            :class="img.image_url === selectedImageUrl ? 'border-accent opacity-100' : 'border-transparent'"
            @click="selectedImageUrl = img.image_url"
          />
        </div>
      </div>

      <div class="flex-1">
        <h1>{{ book.title }}</h1>
        <p class="mt-2 text-[15px]"><strong>Tác giả:</strong> {{ book.author?.name || 'Đang cập nhật' }}</p>
        <p class="text-[15px]"><strong>Nhà xuất bản:</strong> {{ book.publisher?.name || 'Đang cập nhật' }}</p>
        <p class="text-[15px]"><strong>Danh mục:</strong> {{ book.category?.name }}</p>
        <p class="mt-2 text-2xl font-semibold text-accent">{{ formatPrice(book.price) }}</p>
        <p class="mt-1 text-[15px]"><strong>Tồn kho:</strong> {{ book.stock_quantity }}</p>
        <p class="mt-3 whitespace-pre-line text-[15px] text-text-secondary">{{ book.description || 'Chưa có mô tả' }}</p>

        <div class="mt-4 flex items-center gap-3">
          <label for="quantity" class="sr-only">Số lượng</label>
          <input
            id="quantity"
            v-model.number="quantity"
            type="number"
            min="1"
            :max="book.stock_quantity"
            class="min-h-[44px] w-20 rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <BaseButton :disabled="book.stock_quantity <= 0" :loading="addingToCart" @click="addToCart">
            {{ book.stock_quantity <= 0 ? 'Hết hàng' : 'Thêm vào giỏ' }}
          </BaseButton>
        </div>
        <p v-if="cartMessage" class="mt-2 text-sm" :class="cartMessageIsError ? 'text-danger' : 'text-success'">
          {{ cartMessage }}
        </p>
      </div>
    </div>
  </div>
</template>
