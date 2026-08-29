// Khai báo toàn bộ route theo đúng danh sách view trong spec.
// Route /admin/* có thêm meta.requiresAdmin để router guard bên dưới chặn truy cập trái phép.
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

// Customer views
import Home from '../views/customer/Home.vue';
import BookDetail from '../views/customer/BookDetail.vue';
import Cart from '../views/customer/Cart.vue';
import Checkout from '../views/customer/Checkout.vue';
import OrderList from '../views/customer/OrderList.vue';
import OrderStatus from '../views/customer/OrderStatus.vue';
import Account from '../views/customer/Account.vue';
import Login from '../views/customer/Login.vue';
import Register from '../views/customer/Register.vue';

// Admin views
import Dashboard from '../views/admin/Dashboard.vue';
import BookManage from '../views/admin/BookManage.vue';
import CategoryManage from '../views/admin/CategoryManage.vue';
import AuthorManage from '../views/admin/AuthorManage.vue';
import PublisherManage from '../views/admin/PublisherManage.vue';
import SupplierManage from '../views/admin/SupplierManage.vue';
import StockImportManage from '../views/admin/StockImportManage.vue';
import OrderManage from '../views/admin/OrderManage.vue';
import CustomerManage from '../views/admin/CustomerManage.vue';
import AdminAccount from '../views/admin/Account.vue';

const routes = [
  // Customer
  { path: '/', name: 'home', component: Home },
  { path: '/books/:id', name: 'book-detail', component: BookDetail },
  // requiresAuth: cần đăng nhập (customer hoặc admin đều được), khác với requiresAdmin ở dưới
  { path: '/cart', name: 'cart', component: Cart, meta: { requiresAuth: true } },
  { path: '/checkout', name: 'checkout', component: Checkout, meta: { requiresAuth: true } },
  { path: '/orders', name: 'order-list', component: OrderList, meta: { requiresAuth: true } },
  { path: '/orders/:id', name: 'order-status', component: OrderStatus, meta: { requiresAuth: true } },
  { path: '/account', name: 'account', component: Account, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },

  // Admin — meta.requiresAdmin đánh dấu để guard bên dưới kiểm tra quyền trước khi vào
  { path: '/admin', name: 'admin-dashboard', component: Dashboard, meta: { requiresAdmin: true } },
  { path: '/admin/books', name: 'admin-books', component: BookManage, meta: { requiresAdmin: true } },
  { path: '/admin/categories', name: 'admin-categories', component: CategoryManage, meta: { requiresAdmin: true } },
  { path: '/admin/authors', name: 'admin-authors', component: AuthorManage, meta: { requiresAdmin: true } },
  { path: '/admin/publishers', name: 'admin-publishers', component: PublisherManage, meta: { requiresAdmin: true } },
  { path: '/admin/suppliers', name: 'admin-suppliers', component: SupplierManage, meta: { requiresAdmin: true } },
  {
    path: '/admin/stock-imports',
    name: 'admin-stock-imports',
    component: StockImportManage,
    meta: { requiresAdmin: true },
  },
  { path: '/admin/orders', name: 'admin-orders', component: OrderManage, meta: { requiresAdmin: true } },
  { path: '/admin/customers', name: 'admin-customers', component: CustomerManage, meta: { requiresAdmin: true } },
  { path: '/admin/account', name: 'admin-account', component: AdminAccount, meta: { requiresAdmin: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route guard chạy trước mỗi lần chuyển route (kể cả F5 lần đầu):
// - requiresAdmin (khu vực /admin/*): phải vừa đăng nhập vừa có role admin.
// - requiresAuth (/cart, /checkout, /orders/:id...): chỉ cần đăng nhập, không cần admin.
// Sau khi đăng xuất (token bị xóa), isLoggedIn trả về false nên cố vào lại các route này sẽ bị
// đá về trang login ngay từ lần điều hướng tiếp theo.
router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAdmin) {
    if (!authStore.isLoggedIn || !authStore.isAdmin) return { name: 'login' };
    return true;
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isLoggedIn) return { name: 'login' };
    return true;
  }

  return true;
});

export default router;
