<script setup>
// Giỏ hàng: danh sách sách, tăng/giảm số lượng, xóa dòng, tổng tiền, điều hướng sang Checkout.
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../../stores/cart.store';
import BaseButton from '../../components/common/BaseButton.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';

const PLACEHOLDER_IMAGE = 'https://placehold.co/80x110?text=No+Image';

const router = useRouter();
const cartStore = useCartStore();

const loading = ref(true);
const errorMessage = ref('');
const updatingBookId = ref(null); // book_id đang xử lý +/- để disable đúng nút đó, tránh double click

const debounceTimers = {}; // debounce riêng cho từng dòng khi gõ tay vào ô số lượng (key = book_id)

const confirmState = ref({ show: false, item: null });

async function loadCart() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await cartStore.fetchCart();
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Không tải được giỏ hàng';
  } finally {
    loading.value = false;
  }
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

async function changeQuantity(item, newQuantity) {
  if (newQuantity < 1 || newQuantity > item.stock_quantity) return;
  updatingBookId.value = item.book_id;
  errorMessage.value = '';
  const result = await cartStore.updateItem(item.book_id, newQuantity);
  if (!result.success) errorMessage.value = result.message;
  updatingBookId.value = null;
}

// Gõ tay vào ô số lượng -> debounce nhẹ 400ms để tránh gọi API liên tục theo từng phím gõ.
// Dùng :value + @input (không dùng v-model) để ô nhập không bị "giật" giá trị cũ về khi Vue
// re-render trong lúc người dùng vẫn đang gõ dở, tránh xung đột giữa gõ tay và cập nhật debounce.
function onQuantityInput(item, event) {
  const value = Number(event.target.value);
  clearTimeout(debounceTimers[item.book_id]);
  debounceTimers[item.book_id] = setTimeout(() => {
    if (Number.isInteger(value) && value > 0) changeQuantity(item, value);
  }, 400);
}

function askRemoveItem(item) {
  confirmState.value = { show: true, item };
}

async function confirmRemoveItem() {
  const item = confirmState.value.item;
  confirmState.value = { show: false, item: null };
  errorMessage.value = '';
  const result = await cartStore.removeItem(item.book_id);
  if (!result.success) errorMessage.value = result.message;
}

function goToCheckout() {
  router.push('/checkout');
}

function goHome() {
  router.push('/');
}

onMounted(loadCart);
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <h1>Giỏ hàng</h1>

    <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>
    <p v-if="loading" class="mt-4 text-sm text-text-secondary">Đang tải...</p>

    <EmptyState
      v-else-if="cartStore.items.length === 0"
      class="mt-4"
      icon="🛒"
      title="Giỏ hàng trống"
      description="Chưa có sách nào trong giỏ hàng của bạn."
      action-label="Về trang chủ"
      @action="goHome"
    />

    <template v-else>
      <div class="mt-4 flex flex-col gap-3">
        <div
          v-for="item in cartStore.items"
          :key="item.book_id"
          class="flex items-center gap-4 rounded-lg bg-surface p-3 shadow-sm"
        >
          <img
            :src="item.primary_image_url || PLACEHOLDER_IMAGE"
            :alt="item.title"
            class="h-[84px] w-[60px] shrink-0 rounded-lg object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ item.title }}</p>
            <p class="text-sm text-text-secondary">{{ formatPrice(item.price) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex h-9 w-9 min-h-[36px] items-center justify-center rounded-lg border border-border hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="updatingBookId === item.book_id || item.quantity <= 1"
              aria-label="Giảm số lượng"
              @click="changeQuantity(item, item.quantity - 1)"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              :max="item.stock_quantity"
              :value="item.quantity"
              class="w-14 rounded-lg border border-border px-2 py-1 text-center text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              @input="onQuantityInput(item, $event)"
            />
            <button
              type="button"
              class="flex h-9 w-9 min-h-[36px] items-center justify-center rounded-lg border border-border hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="updatingBookId === item.book_id || item.quantity >= item.stock_quantity"
              aria-label="Tăng số lượng"
              @click="changeQuantity(item, item.quantity + 1)"
            >
              +
            </button>
          </div>
          <p class="w-28 shrink-0 text-right font-semibold text-accent">{{ formatPrice(item.price * item.quantity) }}</p>
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] rounded-lg text-sm text-danger hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="askRemoveItem(item)"
          >
            Xóa
          </button>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-end gap-5">
        <p class="text-lg">Tổng tiền: <strong class="text-accent">{{ formatPrice(cartStore.totalAmount) }}</strong></p>
        <BaseButton @click="goToCheckout">Tiến hành đặt hàng</BaseButton>
      </div>
    </template>

    <ConfirmDialog
      :show="confirmState.show"
      title="Xóa sản phẩm"
      :message="`Xóa “${confirmState.item?.title}” khỏi giỏ hàng?`"
      confirm-label="Xóa"
      @confirm="confirmRemoveItem"
      @cancel="confirmState.show = false"
    />
  </div>
</template>
