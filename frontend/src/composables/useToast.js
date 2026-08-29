// Composable quản lý toast dùng chung — gọi showToast() từ bất kỳ component nào, không cần
// truyền props/emit qua nhiều tầng. State dùng chung 1 mảng reactive ở module scope (không cần
// Pinia store riêng vì chỉ phục vụ UI tạm thời, không phải dữ liệu nghiệp vụ).
import { reactive } from 'vue';

const toasts = reactive([]);
let idCounter = 0;

function showToast(message, type = 'success') {
  const id = ++idCounter;
  toasts.push({ id, message, type });
  setTimeout(() => removeToast(id), 3000);
}

function removeToast(id) {
  const index = toasts.findIndex((t) => t.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

export function useToast() {
  return { toasts, showToast, removeToast };
}
