<script setup>
// Đặt hàng: tóm tắt giỏ hàng (read-only) + form thông tin giao hàng + phương thức thanh toán.
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../../stores/cart.store';
import { useOrderStore } from '../../stores/order.store';
import BaseButton from '../../components/common/BaseButton.vue';

const router = useRouter();
const cartStore = useCartStore();
const orderStore = useOrderStore();

const form = ref({
  shipping_name: '',
  shipping_phone: '',
  shipping_address: '',
  payment_method: 'bank_transfer',
  note: '',
});
const formError = ref('');
const submitting = ref(false);

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

function validateForm() {
  if (!form.value.shipping_name.trim()) return 'Vui lòng nhập tên người nhận';
  if (!/^[0-9]{9,11}$/.test(form.value.shipping_phone.trim())) {
    return 'Số điện thoại không hợp lệ (9-11 chữ số)';
  }
  if (!form.value.shipping_address.trim()) return 'Vui lòng nhập địa chỉ giao hàng';
  return null;
}

async function submitOrder() {
  const validationError = validateForm();
  if (validationError) {
    formError.value = validationError;
    return;
  }

  submitting.value = true;
  formError.value = '';
  const result = await orderStore.checkout(form.value);
  if (result.success) {
    // Route chi tiết đơn đã có sẵn dạng /orders/:id (router/index.js) -> điều hướng sang đó
    // để xem trạng thái/QR chuyển khoản, đúng tinh thần "route dạng /orders/:id/status" trong spec.
    router.push(`/orders/${result.data.order_id}`);
  } else {
    formError.value = result.message;
    submitting.value = false;
  }
}

onMounted(() => {
  // Giỏ hàng luôn được tải sẵn khi đăng nhập/F5 (auth.store.js), nhưng phòng trường hợp cart rỗng
  // do vào thẳng /checkout bằng URL trước khi lần tải đầu tiên kịp xong -> tải lại cho chắc.
  if (cartStore.items.length === 0) cartStore.fetchCart();
});
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1>Đặt hàng</h1>

    <div v-if="cartStore.items.length === 0" class="mt-6 text-text-secondary">
      <p>Giỏ hàng trống, không có gì để đặt hàng.</p>
      <router-link to="/" class="text-primary hover:underline">Quay về trang chủ</router-link>
    </div>

    <div v-else class="mt-6 flex flex-col gap-5">
      <div class="rounded-lg bg-surface p-4 shadow-sm">
        <h3>Tóm tắt đơn hàng</h3>
        <div v-for="item in cartStore.items" :key="item.book_id" class="flex justify-between py-1 text-sm text-text-secondary">
          <span>{{ item.title }} × {{ item.quantity }}</span>
          <span>{{ formatPrice(item.price * item.quantity) }}</span>
        </div>
        <div class="mt-2 flex justify-between border-t border-border pt-2 text-[16px]">
          <span>Tổng tiền</span>
          <strong class="text-accent">{{ formatPrice(cartStore.totalAmount) }}</strong>
        </div>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submitOrder">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Tên người nhận</label>
          <input
            v-model="form.shipping_name"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Số điện thoại</label>
          <input
            v-model="form.shipping_phone"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Địa chỉ giao hàng</label>
          <input
            v-model="form.shipping_address"
            type="text"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">Ghi chú</label>
          <input
            v-model="form.note"
            type="text"
            placeholder="Không bắt buộc"
            class="min-h-[44px] rounded-lg border border-border px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-text-primary">Phương thức thanh toán</span>
          <label class="flex min-h-[44px] items-center gap-2 text-[15px]">
            <input v-model="form.payment_method" type="radio" value="bank_transfer" class="h-4 w-4 accent-primary" />
            Chuyển khoản (SePay)
          </label>
          <label class="flex min-h-[44px] items-center gap-2 text-[15px]">
            <input v-model="form.payment_method" type="radio" value="cod" class="h-4 w-4 accent-primary" />
            Thanh toán khi nhận hàng (COD)
          </label>
        </div>

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>
        <BaseButton type="submit" class="self-start" :loading="submitting">
          {{ submitting ? 'Đang đặt hàng...' : 'Đặt hàng' }}
        </BaseButton>
      </form>
    </div>
  </div>
</template>
