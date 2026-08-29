# SPEC: Website Bán Sách (Bookstore) — Tài liệu kỹ thuật cho AI Coding

> Tài liệu này mô tả đầy đủ database, API, luồng nghiệp vụ và cấu trúc project để AI (hoặc dev) có thể code trực tiếp mà không cần hỏi lại. Mọi endpoint đều có request/response mẫu cụ thể.

---

## 1. Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js + Express.js |
| Database | MySQL 8 |
| ORM/Query | mysql2 (raw query) hoặc Sequelize (chọn 1, khuyến nghị Sequelize cho người mới) |
| Frontend | Vue 3 (Composition API) + Vue Router + Pinia (state management) |
| CSS | Tailwind CSS (utility-first, cấu hình theo mục 10 để đồng bộ toàn bộ giao diện) |
| Font | Google Fonts: `Lora` (tiêu đề) + `Be Vietnam Pro` (nội dung, hỗ trợ dấu tiếng Việt tốt) |
| Auth | JWT (jsonwebtoken) + bcrypt (hash password) |
| Realtime | Socket.io (thông báo trạng thái đơn hàng) |
| Thanh toán | SePay (webhook xác nhận chuyển khoản tự động) |
| Lưu trữ ảnh | Cloudinary (multer nhận file từ client, Cloudinary SDK upload lên cloud, DB chỉ lưu URL) |
| API style | RESTful JSON |

---

## 2. Cấu trúc thư mục đề xuất

```
project-root/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # kết nối MySQL
│   │   │   ├── env.js             # đọc biến môi trường
│   │   │   └── cloudinary.js      # MỚI: khởi tạo Cloudinary SDK
│   │   ├── models/                # định nghĩa bảng (Sequelize) hoặc query functions
│   │   │   ├── user.model.js
│   │   │   ├── category.model.js
│   │   │   ├── author.model.js
│   │   │   ├── publisher.model.js
│   │   │   ├── book.model.js
│   │   │   ├── cartItem.model.js
│   │   │   ├── order.model.js
│   │   │   ├── orderItem.model.js
│   │   │   ├── payment.model.js
│   │   │   ├── supplier.model.js
│   │   │   ├── stockImport.model.js
│   │   │   ├── stockImportItem.model.js
│   │   │   └── bookImage.model.js     # MỚI: quản lý ảnh sách (nhiều ảnh/1 sách)
│   │   ├── controllers/
│   │   │   ├── auth.controller.js     # bao gồm cả cập nhật hồ sơ, đổi mật khẩu (mục 6.1)
│   │   │   ├── user.controller.js     # MỚI: admin quản lý khách hàng (xem, khóa/mở khóa)
│   │   │   ├── book.controller.js
│   │   │   ├── category.controller.js
│   │   │   ├── author.controller.js
│   │   │   ├── publisher.controller.js
│   │   │   ├── cart.controller.js
│   │   │   ├── order.controller.js
│   │   │   ├── payment.controller.js
│   │   │   ├── supplier.controller.js
│   │   │   ├── stockImport.controller.js
│   │   │   └── bookImage.controller.js    # MỚI: upload/xóa/đặt ảnh đại diện
│   │   ├── routes/
│   │   │   ├── auth.routes.js         # bao gồm cả route cập nhật hồ sơ, đổi mật khẩu
│   │   │   ├── user.routes.js         # MỚI: admin quản lý khách hàng
│   │   │   ├── book.routes.js         # bao gồm cả route upload/xóa/đặt ảnh đại diện (mục 6.5)
│   │   │   ├── category.routes.js
│   │   │   ├── author.routes.js
│   │   │   ├── publisher.routes.js
│   │   │   ├── cart.routes.js
│   │   │   ├── order.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── supplier.routes.js
│   │   │   └── stockImport.routes.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js     # verify JWT
│   │   │   ├── admin.middleware.js    # check role admin
│   │   │   ├── error.middleware.js    # xử lý lỗi tập trung
│   │   │   └── upload.middleware.js   # MỚI: cấu hình multer nhận file ảnh (memory storage)
│   │   ├── sockets/
│   │   │   └── orderSocket.js         # emit event khi đơn hàng đổi trạng thái
│   │   ├── utils/
│   │   │   ├── generateOrderCode.js
│   │   │   ├── generateImportCode.js
│   │   │   └── response.js            # format response chuẩn
│   │   └── app.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   ├── customer/
│   │   │   │   ├── Home.vue
│   │   │   │   ├── BookDetail.vue
│   │   │   │   ├── Cart.vue
│   │   │   │   ├── Checkout.vue
│   │   │   │   ├── OrderStatus.vue    # chi tiết 1 đơn hàng (dùng chung lúc chờ thanh toán và xem lại sau)
│   │   │   │   ├── OrderList.vue      # MỚI: "Đơn hàng của tôi" — có filter, phân trang
│   │   │   │   ├── Account.vue        # MỚI: xem/sửa hồ sơ, đổi mật khẩu
│   │   │   │   ├── Login.vue
│   │   │   │   └── Register.vue
│   │   │   └── admin/
│   │   │       ├── Dashboard.vue
│   │   │       ├── BookManage.vue
│   │   │       ├── CategoryManage.vue
│   │   │       ├── AuthorManage.vue
│   │   │       ├── PublisherManage.vue
│   │   │       ├── SupplierManage.vue
│   │   │       ├── StockImportManage.vue
│   │   │       ├── OrderManage.vue
│   │   │       ├── CustomerManage.vue # MỚI: admin xem/khóa/mở khóa tài khoản khách hàng
│   │   │       └── Account.vue        # MỚI: admin xem/sửa hồ sơ, đổi mật khẩu của chính mình
│   │   ├── stores/            # Pinia
│   │   │   ├── auth.store.js
│   │   │   ├── cart.store.js
│   │   │   └── order.store.js
│   │   ├── services/          # gọi API (axios)
│   │   │   ├── api.js
│   │   │   ├── auth.service.js        # bao gồm cả cập nhật hồ sơ, đổi mật khẩu
│   │   │   ├── user.service.js        # MỚI: admin quản lý khách hàng
│   │   │   ├── book.service.js
│   │   │   ├── cart.service.js
│   │   │   └── order.service.js
│   │   ├── router/
│   │   └── App.vue
│   └── package.json
└── docker-compose.yml
```

---

## 3. Environment Variables (`.env`)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bookstore
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# SePay
SEPAY_API_TOKEN=your_sepay_api_token
SEPAY_WEBHOOK_SECRET=your_webhook_secret   # dùng để verify request từ SePay
SEPAY_ACCOUNT_NUMBER=your_bank_account
SEPAY_BANK_CODE=your_bank_code             # mã ngân hàng dùng để tra cứu qua SePay API (nếu cần)

# VietQR (tạo QR chuyển khoản fix cứng số tiền + nội dung)
VIETQR_BANK_BIN=970422                     # mã BIN ngân hàng theo chuẩn VietQR, vd MB Bank = 970422 — tra tại https://vietqr.io/danh-sach-api
VIETQR_ACCOUNT_NUMBER=your_bank_account    # thường trùng SEPAY_ACCOUNT_NUMBER
VIETQR_ACCOUNT_NAME=NGUYEN VAN A           # tên chủ tài khoản, KHÔNG dấu, viết hoa (đúng yêu cầu VietQR)
VIETQR_TEMPLATE=compact2                   # kiểu giao diện QR: compact | compact2 | qr_only | print

# Frontend URL (dùng cho CORS)
FRONTEND_URL=http://localhost:5173

# Cloudinary (lưu trữ ảnh sách)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 4. Database Schema

> **Thay đổi so với bản trước**: tách `author` và `publisher` ra thành bảng riêng (`authors`, `publishers`) liên kết với `books` qua khóa ngoại thay vì lưu chuỗi text. Bổ sung nhóm bảng phục vụ **nhập hàng** (`suppliers`, `stock_imports`, `stock_import_items`). Cột `books.stock_quantity` vẫn giữ nguyên trong bảng `books` để hiển thị tồn kho hiện tại, nhưng **không còn được nhập trực tiếp khi thêm/sửa sách** — giá trị này chỉ tăng khi tạo phiếu nhập hàng và giảm khi đơn hàng chuyển sang `paid` (xem mục 9). Bảng `books` cũng **bỏ cột `image_url`** — 1 sách giờ có thể có **nhiều ảnh**, chuyển sang lưu ở bảng riêng `book_images`, ảnh thật được lưu trên **Cloudinary**, DB chỉ giữ URL.

```sql
CREATE DATABASE IF NOT EXISTS bookstore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookstore;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- MỚI: tác giả (tách riêng khỏi books)
-- =========================
CREATE TABLE authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- MỚI: nhà xuất bản (tách riêng khỏi books)
-- =========================
CREATE TABLE publishers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    author_id INT NOT NULL,
    publisher_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,     -- KHÔNG set trực tiếp qua API tạo/sửa sách. Chỉ đổi qua nhập hàng (+) và đơn hàng paid (-)
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (author_id) REFERENCES authors(id),
    FOREIGN KEY (publisher_id) REFERENCES publishers(id),
    FULLTEXT KEY ft_title (title)              -- FULLTEXT chỉ còn trên title vì author giờ ở bảng khác
);

-- =========================
-- MỚI: ảnh sách (1 sách có thể có nhiều ảnh, lưu trên Cloudinary)
-- =========================
CREATE TABLE book_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,             -- secure_url trả về từ Cloudinary
    cloudinary_public_id VARCHAR(255) NOT NULL,  -- public_id Cloudinary, cần để xóa ảnh thật sau này
    is_primary TINYINT(1) NOT NULL DEFAULT 0,    -- ảnh đại diện, hiển thị ở danh sách/thumbnail
    display_order INT NOT NULL DEFAULT 0,        -- thứ tự hiển thị trong gallery chi tiết sách
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_book (user_id, book_id)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(20) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending','paid','processing','shipping','completed','cancelled','delivery_failed') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cod','bank_transfer') NOT NULL DEFAULT 'bank_transfer',
    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT NOT NULL,
    book_title VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    gateway VARCHAR(50) NOT NULL DEFAULT 'sepay',
    gateway_transaction_id VARCHAR(100),
    transfer_content VARCHAR(255),
    status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
    raw_payload JSON,
    paid_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    changed_by ENUM('system','admin') NOT NULL DEFAULT 'system',
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- =========================
-- MỚI: nhà cung cấp (dùng cho nhập hàng)
-- =========================
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- MỚI: phiếu nhập hàng (header)
-- =========================
CREATE TABLE stock_imports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_code VARCHAR(20) NOT NULL UNIQUE,   -- vd: PN20260815001
    supplier_id INT NOT NULL,
    created_by INT NOT NULL,                   -- admin tạo phiếu nhập
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =========================
-- MỚI: chi tiết phiếu nhập hàng
-- =========================
CREATE TABLE stock_import_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stock_import_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    import_price DECIMAL(12,2) NOT NULL,       -- giá nhập, khác với books.price (giá bán)
    FOREIGN KEY (stock_import_id) REFERENCES stock_imports(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id)
);
```

---

## 5. Chuẩn Response API

Mọi response trả về theo format thống nhất:

**Thành công:**
```json
{
  "success": true,
  "message": "Lấy danh sách sách thành công",
  "data": { }
}
```

**Lỗi:**
```json
{
  "success": false,
  "message": "Email đã tồn tại",
  "error_code": "EMAIL_EXISTS"
}
```

HTTP status codes dùng: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `500` Internal Server Error.

**Quy ước phân trang & tìm kiếm (áp dụng thống nhất cho MỌI endpoint trả về danh sách)**: tất cả các API `GET` trả về nhiều bản ghi (books, categories, authors, publishers, suppliers, stock-imports, orders, users...) đều nhận 2 query param chung `page` (mặc định 1) và `limit` (mặc định 10, riêng `books` mặc định 12), và trả kèm object `pagination` trong `data`:
```json
"pagination": { "page": 1, "limit": 10, "total": 45, "total_pages": 5 }
```
Module nào có nhu cầu tìm kiếm sẽ nhận thêm `?keyword=` (tìm theo tên/trường chính của module đó bằng `LIKE '%keyword%'`, riêng `books` dùng FULLTEXT như đã nêu). Chi tiết param riêng của từng module được nêu cụ thể ở từng mục bên dưới.

---

## 6. API Endpoints

### 6.1. Auth (`/api/auth`)

#### POST `/api/auth/register`
Request:
```json
{
  "full_name": "Nguyễn Văn A",
  "email": "a@example.com",
  "password": "123456",
  "phone": "0900000000"
}
```
Response `201`:
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": { "id": 5, "full_name": "Nguyễn Văn A", "email": "a@example.com" }
}
```
Logic: kiểm tra email đã tồn tại chưa (`409` nếu trùng) → hash password bằng bcrypt (`saltRounds = 10`) → insert `role = 'customer'`.

#### POST `/api/auth/login`
Request:
```json
{ "email": "a@example.com", "password": "123456" }
```
Response `200`:
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": 5, "full_name": "Nguyễn Văn A", "role": "customer" }
  }
}
```
Logic: tìm user theo email (nếu không có → `401` `"INVALID_CREDENTIALS"`) → so sánh password bằng `bcrypt.compare` (sai → `401` `"INVALID_CREDENTIALS"`) → **kiểm tra `is_active = 1`, nếu tài khoản đã bị khóa → `403` `error_code: "ACCOUNT_LOCKED"`, message rõ ràng "Tài khoản của bạn đã bị khóa"** → ký JWT payload `{ id, role }`, hết hạn theo `JWT_EXPIRES_IN`.

#### GET `/api/auth/me` (yêu cầu token)
Response `200`: trả thông tin user hiện tại dựa vào token.

#### PUT `/api/auth/me` (yêu cầu token) — MỚI, cập nhật hồ sơ cá nhân
Dùng chung cho cả customer và admin tự sửa thông tin của chính mình.
Request:
```json
{ "full_name": "Nguyễn Văn A", "phone": "0911222333", "address": "456 Đường XYZ, Q.2, TP.HCM" }
```
Logic: chỉ cho sửa `full_name`, `phone`, `address` — KHÔNG cho sửa `email` hay `role` qua endpoint này (đổi email/role coi như thao tác nhạy cảm, ngoài phạm vi bản đơn giản này). Trả lại thông tin user đã cập nhật (không kèm `password`).

#### PUT `/api/auth/change-password` (yêu cầu token) — MỚI, đổi mật khẩu
Request:
```json
{ "old_password": "123456", "new_password": "newpass789" }
```
Logic: lấy user hiện tại theo `req.user.id` → so sánh `old_password` với hash hiện tại bằng `bcrypt.compare` (sai → `400` `error_code: "WRONG_OLD_PASSWORD"`) → validate `new_password` tối thiểu 6 ký tự → hash mật khẩu mới bằng bcrypt → update. Response `200` chỉ trả message thành công, không trả token mới (token cũ vẫn dùng được bình thường vì JWT không lưu password trong payload).

#### Đăng xuất (Logout) — Client-side only, KHÔNG có API endpoint
Hệ thống dùng JWT stateless (server không lưu trạng thái đăng nhập), nên đăng xuất được xử lý **hoàn toàn ở phía client**, không cần gọi API:
1. Frontend xóa `token` đã lưu trong `localStorage`.
2. Reset toàn bộ state trong `auth.store.js` (Pinia) về rỗng (`user = null`, `token = null`).
3. Điều hướng người dùng về trang chủ hoặc trang đăng nhập.

Token JWT cũ vẫn còn hợp lệ về mặt kỹ thuật cho tới khi hết hạn (`JWT_EXPIRES_IN`), nhưng vì không còn được lưu trữ hay gửi kèm request nào nữa nên coi như đã đăng xuất. Cách này phù hợp vì `JWT_EXPIRES_IN` không quá dài; không cần bảng blacklist hay endpoint logout phía server.

---

### 6.2. Categories (`/api/categories`)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/categories` | Public | Danh sách loại sách — hỗ trợ `?keyword=&page=&limit=` |
| GET | `/api/categories/:id` | Public | Chi tiết 1 loại |
| POST | `/api/categories` | Admin | Tạo loại sách mới |
| PUT | `/api/categories/:id` | Admin | Sửa loại sách |
| DELETE | `/api/categories/:id` | Admin | Xóa loại sách |

Response danh sách trả kèm `pagination` theo đúng quy ước chung ở mục 5.

POST/PUT request:
```json
{ "name": "Tiểu thuyết", "slug": "tieu-thuyet", "description": "Sách tiểu thuyết trong và ngoài nước" }
```

Logic xóa: kiểm tra còn `book` nào thuộc category này không, nếu còn → trả lỗi `409` error_code `"CATEGORY_HAS_BOOKS"`.

---

### 6.3. Authors — Tác giả (`/api/authors`) — MỚI

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/authors` | Public | Danh sách tác giả — hỗ trợ `?keyword=&page=&limit=` tìm theo tên |
| GET | `/api/authors/:id` | Public | Chi tiết 1 tác giả |
| POST | `/api/authors` | Admin | Thêm tác giả mới |
| PUT | `/api/authors/:id` | Admin | Sửa thông tin tác giả |
| DELETE | `/api/authors/:id` | Admin | Xóa tác giả |

Response danh sách trả kèm `pagination` theo đúng quy ước chung ở mục 5.

POST/PUT request:
```json
{ "name": "J.K. Rowling", "bio": "Nhà văn người Anh, tác giả bộ Harry Potter" }
```

Logic xóa: kiểm tra còn `book` nào tham chiếu `author_id` này không, nếu còn → trả lỗi `409` error_code `"AUTHOR_HAS_BOOKS"`.

---

### 6.4. Publishers — Nhà xuất bản (`/api/publishers`) — MỚI

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/publishers` | Public | Danh sách nhà xuất bản — hỗ trợ `?keyword=&page=&limit=` tìm theo tên |
| GET | `/api/publishers/:id` | Public | Chi tiết 1 nhà xuất bản |
| POST | `/api/publishers` | Admin | Thêm nhà xuất bản mới |
| PUT | `/api/publishers/:id` | Admin | Sửa thông tin |
| DELETE | `/api/publishers/:id` | Admin | Xóa |

Response danh sách trả kèm `pagination` theo đúng quy ước chung ở mục 5.

POST/PUT request:
```json
{ "name": "NXB Trẻ", "address": "161B Lý Chính Thắng, Q.3, TP.HCM" }
```

Logic xóa: kiểm tra còn `book` nào tham chiếu `publisher_id` này không, nếu còn → trả lỗi `409` error_code `"PUBLISHER_HAS_BOOKS"`.

---

### 6.5. Books (`/api/books`)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/books` | Public | Danh sách sách (có filter, phân trang, tìm kiếm) |
| GET | `/api/books/:id` | Public | Chi tiết sách |
| POST | `/api/books` | Admin | Thêm sách |
| PUT | `/api/books/:id` | Admin | Sửa sách |
| DELETE | `/api/books/:id` | Admin | Xóa (nên soft-delete: set `is_active = 0`) |
| POST | `/api/books/:id/images` | Admin | Upload nhiều ảnh cho 1 sách (multipart/form-data) — MỚI |
| DELETE | `/api/books/:id/images/:imageId` | Admin | Xóa 1 ảnh khỏi sách (và khỏi Cloudinary) — MỚI |
| PUT | `/api/books/:id/images/:imageId/primary` | Admin | Đặt 1 ảnh làm ảnh đại diện — MỚI |

> **Thay đổi quan trọng**: `author`/`publisher` giờ là `author_id`/`publisher_id` (khóa ngoại, chọn từ danh sách có sẵn ở mục 6.3, 6.4 — nếu tác giả/NXB chưa có trong hệ thống thì phải tạo trước qua API tương ứng). **`stock_quantity` KHÔNG còn nằm trong request body khi tạo/sửa sách** — sách mới luôn khởi tạo `stock_quantity = 0`, muốn có hàng bán thì phải tạo phiếu nhập hàng (mục 6.10). **Ảnh không còn nằm trong request body tạo/sửa sách** — vì phải upload file (multipart), ảnh được thêm sau bằng 3 endpoint riêng ở trên, sau khi đã tạo sách (cần có `book_id`).

**GET `/api/books` query params:**
```
?keyword=harry potter    # tìm theo title (FULLTEXT); muốn tìm theo tên tác giả thì join thêm authors.name LIKE
&category_id=2
&author_id=3
&publisher_id=1
&page=1
&limit=12
&sort=price_asc          # price_asc | price_desc | newest
```

Response mẫu:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Harry Potter và Hòn đá Phù thủy",
        "price": 150000,
        "stock_quantity": 20,
        "primary_image_url": "https://res.cloudinary.com/.../hp1.jpg",
        "category": { "id": 2, "name": "Tiểu thuyết" },
        "author": { "id": 3, "name": "J.K. Rowling" },
        "publisher": { "id": 1, "name": "NXB Trẻ" }
      }
    ],
    "pagination": { "page": 1, "limit": 12, "total": 45, "total_pages": 4 }
  }
}
```
> `primary_image_url` (ở response danh sách trên) là ảnh có `is_primary = 1` trong `book_images` — nếu sách chưa có ảnh nào thì trả `null`.

Response mẫu **GET `/api/books/:id`** (chi tiết — trả đầy đủ mảng ảnh thay vì chỉ ảnh đại diện):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Harry Potter và Hòn đá Phù thủy",
    "price": 150000,
    "stock_quantity": 20,
    "category": { "id": 2, "name": "Tiểu thuyết" },
    "author": { "id": 3, "name": "J.K. Rowling" },
    "publisher": { "id": 1, "name": "NXB Trẻ" },
    "images": [
      { "id": 12, "image_url": "https://res.cloudinary.com/.../hp1.jpg", "is_primary": true },
      { "id": 13, "image_url": "https://res.cloudinary.com/.../hp2.jpg", "is_primary": false }
    ]
  }
}
```

POST/PUT request body (tạo/sửa thông tin sách — KHÔNG bao gồm ảnh):
```json
{
  "category_id": 2,
  "author_id": 3,
  "publisher_id": 1,
  "title": "Harry Potter và Hòn đá Phù thủy",
  "description": "...",
  "price": 150000
}
```

Logic: validate `title` không rỗng, `price > 0`, `category_id`/`author_id`/`publisher_id` phải tồn tại trước khi insert/update. Khi tạo mới, backend tự set `stock_quantity = 0`, bỏ qua nếu client vô tình gửi kèm field này trong body (không đọc field đó từ request).

#### POST `/api/books/:id/images` — Upload nhiều ảnh
Request: `multipart/form-data`, field `images` (cho phép chọn nhiều file cùng lúc — input `type="file" multiple"`).

Logic xử lý:
1. Kiểm tra `book` theo `:id` tồn tại (`404` nếu không).
2. Middleware `upload.middleware.js` (multer, memory storage) nhận file, giới hạn: tối đa 5 ảnh/lần upload, mỗi ảnh tối đa 5MB, chỉ nhận định dạng `jpg/jpeg/png/webp`.
3. Với từng file: upload buffer lên Cloudinary (`cloudinary.uploader.upload_stream`), nhận về `secure_url` và `public_id`.
4. Insert từng ảnh vào `book_images` (`book_id`, `image_url = secure_url`, `cloudinary_public_id = public_id`). Nếu đây là ảnh đầu tiên của sách (sách chưa có ảnh nào trước đó), tự động set `is_primary = 1` cho ảnh đầu tiên trong lần upload này.
5. Trả về danh sách ảnh vừa thêm.

Response `201`:
```json
{
  "success": true,
  "message": "Tải ảnh lên thành công",
  "data": {
    "images": [
      { "id": 12, "image_url": "https://res.cloudinary.com/.../hp1.jpg", "is_primary": true },
      { "id": 13, "image_url": "https://res.cloudinary.com/.../hp2.jpg", "is_primary": false }
    ]
  }
}
```

#### DELETE `/api/books/:id/images/:imageId`
Logic: tìm ảnh theo `imageId` thuộc đúng `book_id`, gọi `cloudinary.uploader.destroy(cloudinary_public_id)` để xóa file thật trên Cloudinary trước, sau đó mới xóa row trong `book_images` (tránh rác ảnh mồ côi trên Cloudinary nếu chỉ xóa DB). Nếu ảnh vừa xóa đang là `is_primary = 1`, tự động gán `is_primary = 1` cho ảnh còn lại đầu tiên (nếu còn ảnh nào khác); nếu sách hết ảnh thì thôi.

#### PUT `/api/books/:id/images/:imageId/primary`
Logic (transaction): `UPDATE book_images SET is_primary = 0 WHERE book_id = ?` (bỏ primary của toàn bộ ảnh sách đó) → `UPDATE book_images SET is_primary = 1 WHERE id = ?` (gán lại đúng ảnh được chọn).

---

### 6.6. Cart (`/api/cart`) — yêu cầu đăng nhập (role customer)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/cart` | Lấy giỏ hàng của user hiện tại |
| POST | `/api/cart` | Thêm sách vào giỏ |
| PUT | `/api/cart/:bookId` | Cập nhật số lượng |
| DELETE | `/api/cart/:bookId` | Xóa 1 sách khỏi giỏ |
| DELETE | `/api/cart` | Xóa toàn bộ giỏ |

POST request:
```json
{ "book_id": 1, "quantity": 2 }
```
Logic: nếu `book_id` đã có trong giỏ của user → cộng dồn `quantity` (`ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`). Kiểm tra `quantity` không vượt `stock_quantity`.

GET response:
```json
{
  "success": true,
  "data": {
    "items": [
      { "book_id": 1, "title": "Harry Potter...", "price": 150000, "quantity": 2, "primary_image_url": "https://res.cloudinary.com/.../hp1.jpg" }
    ],
    "total_amount": 300000
  }
}
```

---

### 6.7. Orders (`/api/orders`) — yêu cầu đăng nhập

#### POST `/api/orders` — tạo đơn hàng (checkout)
Request:
```json
{
  "shipping_name": "Nguyễn Văn A",
  "shipping_phone": "0900000000",
  "shipping_address": "123 Đường ABC, Quận 1, TP.HCM",
  "payment_method": "bank_transfer",
  "note": "Giao giờ hành chính"
}
```
Logic xử lý (transaction):
1. Lấy toàn bộ `cart_items` của user, nếu rỗng → trả lỗi `400`.
2. Kiểm tra `stock_quantity` từng sách còn đủ không.
3. Tính `total_amount`.
4. Sinh `order_code` duy nhất — format: `DH` + `YYYYMMDD` + số thứ tự 3 chữ số, vd `DH20260814001`.
5. Insert vào `orders` (status = `pending`).
6. Insert từng dòng vào `order_items` (snapshot `title`, `price` tại thời điểm mua).
7. Insert `order_status_history` (`status = 'pending'`, `changed_by = 'system'`).
8. Xóa toàn bộ `cart_items` của user.
9. Nếu `payment_method = 'bank_transfer'`: insert 1 dòng `payments` (`status = 'pending'`), build `qr_url` theo chuẩn **VietQR** (ảnh QR nhúng sẵn số tiền + nội dung, khách chỉ cần quét — không cần gõ tay), trả về kèm thông tin QR/số tài khoản để FE hiển thị.

`qr_url` build theo format:
```
https://img.vietqr.io/image/{VIETQR_BANK_BIN}-{VIETQR_ACCOUNT_NUMBER}-{VIETQR_TEMPLATE}.png?amount={total_amount}&addInfo={order_code}&accountName={VIETQR_ACCOUNT_NAME}
```
(3 tham số `amount`, `addInfo`, `accountName` cần `encodeURIComponent` trước khi ghép vào URL, đặc biệt `accountName` nếu có khoảng trắng.)

Response `201`:
```json
{
  "success": true,
  "message": "Tạo đơn hàng thành công",
  "data": {
    "order_id": 10,
    "order_code": "DH20260814001",
    "total_amount": 300000,
    "status": "pending",
    "payment_info": {
      "bank_account": "0123456789",
      "bank_bin": "970422",
      "account_name": "NGUYEN VAN A",
      "amount": 300000,
      "transfer_content": "DH20260814001",
      "qr_url": "https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=300000&addInfo=DH20260814001&accountName=NGUYEN%20VAN%20A"
    }
  }
}
```

#### GET `/api/orders` — danh sách đơn của user hiện tại (hoặc tất cả nếu admin + query `?all=true`)
Query params hỗ trợ (dùng được cho cả customer xem đơn của mình lẫn admin xem toàn bộ):
```
?status=paid              # lọc theo trạng thái đơn
&from_date=2026-08-01     # lọc theo created_at từ ngày
&to_date=2026-08-31       # lọc theo created_at đến ngày
&keyword=DH2026           # tìm theo order_code; nếu admin (all=true) tìm thêm theo shipping_name
&all=true                 # chỉ admin mới dùng được, bỏ qua filter user_id
&page=1
&limit=10
```
Response trả kèm `pagination` theo đúng quy ước chung ở mục 5.

#### GET `/api/orders/:id` — chi tiết đơn hàng (kèm `order_items`)
#### GET `/api/orders/:id/status` — chỉ trả về status hiện tại, dùng để FE polling nếu không dùng socket:
```json
{ "success": true, "data": { "status": "paid" } }
```

#### PUT `/api/orders/:id/status` — Admin cập nhật trạng thái thủ công
Request:
```json
{ "status": "shipping", "note": "Đã giao cho đơn vị vận chuyển" }
```
Logic: chỉ cho phép chuyển trạng thái theo đúng thứ tự cho phép — dùng 1 map định nghĩa các bước chuyển hợp lệ, KHÔNG hardcode if-else:
```
pending      → paid | cancelled
paid         → processing | cancelled
processing   → shipping
shipping     → completed | delivery_failed
completed    → (kết thúc, không chuyển tiếp)
cancelled    → (kết thúc)
delivery_failed → (kết thúc — xem ghi chú xử lý riêng bên dưới)
```
Không cho nhảy cóc hoặc quay lui ngoài các mũi tên trên. Insert thêm dòng vào `order_status_history` với `changed_by = 'admin'`.

**Trường hợp `shipping → delivery_failed`** (khách không nhận hàng/từ chối nhận khi giao) — ĐÂY LÀ TRƯỜNG HỢP ĐẶC BIỆT DUY NHẤT NGOÀI WEBHOOK ĐƯỢC PHÉP ĐỔI `stock_quantity`, xử lý trong 1 **transaction**:
1. Update `orders.status = 'delivery_failed'`.
2. Lấy `order_items` của đơn, với từng dòng: `UPDATE books SET stock_quantity = stock_quantity + quantity` (hoàn lại đúng số lượng đã trừ lúc đơn chuyển `paid`).
3. Insert `order_status_history` (`status = 'delivery_failed'`, `changed_by = 'admin'`, note bắt buộc phải có lý do, ví dụ "Khách không nhận hàng").
4. Emit socket `order:status_updated` tới khách như bình thường.

Với các trường hợp chuyển trạng thái khác (không phải `delivery_failed`), giữ nguyên logic cũ: chỉ update `orders.status` + insert history + emit socket, KHÔNG đụng vào `stock_quantity`.

#### DELETE `/api/orders/:id` — Hủy đơn (chỉ khi status = `pending`)

---

### 6.8. Payment Webhook (`/api/webhook/sepay`) — Public nhưng phải verify secret

> **Lưu ý quan trọng**: QR VietQR chỉ giúp khách khỏi gõ tay số tiền/nội dung — đây là hỗ trợ UX, **không phải cơ chế bảo mật**. Một số app ngân hàng vẫn cho phép khách sửa lại nội dung/số tiền trước khi xác nhận chuyển. Vì vậy toàn bộ bước so khớp `content` và `transferAmount` bên dưới **bắt buộc phải giữ nguyên**, không được bỏ qua chỉ vì đã dùng QR fix sẵn.

#### POST `/api/webhook/sepay`
SePay sẽ gọi endpoint này mỗi khi có giao dịch chuyển khoản vào tài khoản đã đăng ký. Payload thực tế theo tài liệu SePay, cấu trúc mẫu:
```json
{
  "gateway": "MBBank",
  "transactionDate": "2026-08-14 10:23:00",
  "accountNumber": "0123456789",
  "transferAmount": 300000,
  "content": "DH20260814001 chuyen tien mua sach",
  "referenceCode": "FT26041234567",
  "transferType": "in"
}
```

Logic xử lý:
1. Verify request đến từ SePay (kiểm tra header `Authorization: Bearer <SEPAY_WEBHOOK_SECRET>` mà bạn cấu hình trong SePay dashboard). Nếu sai → `401`, không xử lý gì thêm.
2. Nếu `transferType !== 'in'` → bỏ qua, trả `200` (không phải tiền vào thì không quan tâm).
3. Regex tìm order_code trong `content`: `/DH\d{11}/` (khớp với format `DH20260814001`).
4. Nếu không tìm thấy mã hợp lệ → log lại giao dịch để admin tự đối chiếu thủ công, vẫn trả `200` cho SePay (tránh SePay retry liên tục).
5. Tìm `order` theo `order_code`. Nếu không tồn tại hoặc `status !== 'pending'` → log lại, trả `200`.
6. So khớp `transferAmount === orders.total_amount`. Nếu không khớp → đánh dấu `payments.status = 'failed'`, ghi chú lệch số tiền, KHÔNG tự động set `paid` (để admin xử lý tay).
7. Nếu khớp: transaction cập nhật:
   - `orders.status = 'paid'`
   - `payments.status = 'success'`, `paid_at = now()`, `gateway_transaction_id = referenceCode`, `transfer_content = content`, `raw_payload = <toàn bộ payload>`
   - Trừ `stock_quantity` của từng sách trong `order_items`
   - Insert `order_status_history` (`status = 'paid'`, `changed_by = 'system'`, note = "Xác nhận qua SePay webhook")
8. Emit socket event `order:paid` tới đúng `user_id` của đơn hàng đó, kèm `order_id`.
9. Trả `200 OK` cho SePay (luôn trả 200 nếu request hợp lệ về mặt xác thực, để tránh SePay retry vô ích).

Response cho SePay:
```json
{ "success": true }
```

---

### 6.9. Suppliers — Nhà cung cấp (`/api/suppliers`) — MỚI, Admin only

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/suppliers` | Danh sách nhà cung cấp — hỗ trợ `?keyword=&page=&limit=` tìm theo tên |
| GET | `/api/suppliers/:id` | Chi tiết 1 nhà cung cấp |
| POST | `/api/suppliers` | Thêm nhà cung cấp |
| PUT | `/api/suppliers/:id` | Sửa thông tin |
| DELETE | `/api/suppliers/:id` | Xóa |

Response danh sách trả kèm `pagination` theo đúng quy ước chung ở mục 5.

POST/PUT request:
```json
{
  "name": "Công ty Phát hành sách ABC",
  "phone": "0281234567",
  "email": "contact@abc.vn",
  "address": "45 Nguyễn Trãi, Q.5, TP.HCM"
}
```

Logic xóa: kiểm tra còn `stock_import` nào tham chiếu `supplier_id` này không, nếu còn → trả lỗi `409` error_code `"SUPPLIER_HAS_IMPORTS"`.

Toàn bộ nhóm endpoint này chỉ dành cho Admin (không public) vì đây là dữ liệu quản trị nội bộ, khách hàng không cần xem.

---

### 6.10. Stock Imports — Nhập hàng (`/api/stock-imports`) — MỚI, Admin only

Đây là chức năng ghi nhận việc nhập sách từ nhà cung cấp vào kho — nguồn duy nhất (cùng với đơn hàng `paid`) được phép thay đổi `books.stock_quantity`.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/stock-imports` | Danh sách phiếu nhập (phân trang, filter theo `supplier_id`, khoảng ngày) |
| GET | `/api/stock-imports/:id` | Chi tiết 1 phiếu nhập, kèm danh sách sách đã nhập |
| POST | `/api/stock-imports` | Tạo phiếu nhập hàng mới |

> Phiếu nhập **không có API sửa/xóa** để giữ đơn giản và tránh phải xử lý rollback tồn kho phức tạp. Nếu nhập sai, tạo phiếu nhập mới để điều chỉnh (hoặc để dành làm tính năng nâng cao sau này).

#### POST `/api/stock-imports`
Request:
```json
{
  "supplier_id": 1,
  "note": "Nhập lô sách tháng 8/2026",
  "items": [
    { "book_id": 1, "quantity": 50, "import_price": 90000 },
    { "book_id": 3, "quantity": 30, "import_price": 60000 }
  ]
}
```

Logic xử lý (transaction):
1. Validate: `supplier_id` tồn tại, `items` không rỗng, mỗi `book_id` tồn tại, `quantity > 0`, `import_price >= 0`.
2. Sinh `import_code` duy nhất — format: `PN` + `YYYYMMDD` + số thứ tự 3 chữ số, vd `PN20260815001`.
3. Tính `total_amount = Σ (quantity × import_price)`.
4. Insert 1 dòng `stock_imports` (`created_by` lấy từ `req.user.id` — admin đang đăng nhập).
5. Insert từng dòng vào `stock_import_items`.
6. Với từng item: `UPDATE books SET stock_quantity = stock_quantity + ? WHERE id = ?` (cộng dồn tồn kho).
7. Trả về phiếu nhập vừa tạo kèm danh sách items.

Response `201`:
```json
{
  "success": true,
  "message": "Tạo phiếu nhập hàng thành công",
  "data": {
    "import_id": 4,
    "import_code": "PN20260815001",
    "supplier": { "id": 1, "name": "Công ty Phát hành sách ABC" },
    "total_amount": 6300000,
    "items": [
      { "book_id": 1, "title": "Harry Potter và Hòn đá Phù thủy", "quantity": 50, "import_price": 90000 },
      { "book_id": 3, "title": "Đắc Nhân Tâm", "quantity": 30, "import_price": 60000 }
    ]
  }
}
```

---

### 6.11. Users — Quản lý khách hàng (`/api/users`) — MỚI, Admin only

Đây là phần admin xem và quản lý tài khoản khách hàng. Việc tự xem/sửa hồ sơ, đổi mật khẩu của chính người dùng (dù là customer hay admin) đã có sẵn ở mục 6.1 (`GET/PUT /api/auth/me`, `PUT /api/auth/change-password`) — mục này chỉ dành cho **admin thao tác lên tài khoản người khác**.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users` | Danh sách khách hàng — hỗ trợ `?keyword=&status=&page=&limit=` |
| GET | `/api/users/:id` | Chi tiết 1 khách hàng |
| PUT | `/api/users/:id/lock` | Khóa tài khoản |
| PUT | `/api/users/:id/unlock` | Mở khóa tài khoản |

**GET `/api/users` query params:**
```
?keyword=nguyen           # tìm theo full_name hoặc email, dùng LIKE
&status=active            # active (is_active=1) | locked (is_active=0), bỏ trống = lấy tất cả
&page=1
&limit=10
```
Mặc định chỉ trả `role = 'customer'` (đúng tinh thần "quản lý khách hàng" — không lẫn tài khoản admin khác vào danh sách này).

Response mẫu:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 5,
        "full_name": "Nguyễn Văn A",
        "email": "a@example.com",
        "phone": "0900000000",
        "is_active": true,
        "total_orders": 3,
        "created_at": "2026-08-01T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 20, "total_pages": 2 }
  }
}
```
`total_orders` = đếm số đơn hàng của khách (JOIN/subquery đếm từ bảng `orders`, không bắt buộc phức tạp, chỉ cần đúng số).

#### PUT `/api/users/:id/lock`
Request (không bắt buộc):
```json
{ "reason": "Vi phạm chính sách đặt hàng nhiều lần không nhận" }
```
Logic: set `is_active = 0`. Không cho khóa tài khoản có `role = 'admin'` (kể cả chính mình) — trả `400` `error_code: "CANNOT_LOCK_ADMIN"` nếu cố khóa 1 admin khác. Sau khi bị khóa, người dùng đó không đăng nhập được nữa (chặn ở bước login, mục 6.1) — token cũ nếu còn hạn vẫn dùng được cho tới khi hết hạn (giới hạn đã biết của JWT stateless, xem business rule số 8).

#### PUT `/api/users/:id/unlock`
Logic: set `is_active = 1`.

---

## 7. Socket.io Events

| Event | Hướng | Payload | Mô tả |
|---|---|---|---|
| `order:paid` | Server → Client | `{ order_id, order_code, status: "paid" }` | Bắn khi webhook xác nhận thanh toán thành công |
| `order:status_updated` | Server → Client | `{ order_id, status }` | Bắn khi admin đổi trạng thái đơn |

Client (Vue) join room theo `user_id` sau khi login: `socket.emit('join', userId)`. Server join socket vào room `user_${userId}`, khi cần emit thì `io.to('user_' + userId).emit(...)`.

---

## 8. Middleware Logic

**`auth.middleware.js`**: đọc header `Authorization: Bearer <token>` → verify JWT bằng `JWT_SECRET` → gắn `req.user = { id, role }` → nếu lỗi trả `401`.

**`admin.middleware.js`**: chạy sau `auth.middleware` → kiểm tra `req.user.role === 'admin'` → nếu không trả `403`.

---

## 9. Business Rules quan trọng (AI cần tuân thủ khi code)

1. Password luôn hash bằng bcrypt, không bao giờ trả `password` trong bất kỳ response nào.
2. `order_items.price` và `book_title` luôn snapshot tại thời điểm đặt hàng — không join sang `books` để lấy giá hiện tại khi hiển thị lịch sử đơn cũ.
3. **`stock_quantity` của `books` chỉ được phép thay đổi qua đúng 3 nguồn**:
   - **Tăng (+)**: khi tạo phiếu nhập hàng thành công (mục 6.10).
   - **Tăng (+)**: khi đơn hàng chuyển sang `delivery_failed` — hoàn lại số lượng đã trừ trước đó (mục 6.7).
   - **Giảm (-)**: khi đơn hàng chuyển sang trạng thái `paid` (mục 6.8, hoặc khi admin xác nhận `paid` thủ công nếu có).
   API `POST /api/books` và `PUT /api/books/:id` **không được đọc hay set trực tiếp** field `stock_quantity` từ request body, kể cả khi client cố tình gửi kèm — sách mới luôn khởi tạo `stock_quantity = 0`.
4. Toàn bộ thao tác tạo đơn hàng (mục 6.7), xử lý webhook (mục 6.8), tạo phiếu nhập hàng (mục 6.10), và chuyển trạng thái đơn sang `delivery_failed` (mục 6.7) phải dùng **database transaction** để đảm bảo toàn vẹn dữ liệu (rollback nếu có lỗi giữa chừng) — đặc biệt vì các thao tác này đều vừa ghi nhiều bảng vừa cập nhật `stock_quantity`.
5. Webhook endpoint không được yêu cầu JWT của user (vì SePay gọi trực tiếp), nhưng bắt buộc phải verify bằng secret riêng.
6. Trạng thái đơn hàng chỉ đi theo 1 chiều, dùng đúng bảng chuyển trạng thái đã định nghĩa ở mục 6.7 (`pending → paid/cancelled`, `paid → processing/cancelled`, `processing → shipping`, `shipping → completed/delivery_failed`). `completed`, `cancelled`, `delivery_failed` là các trạng thái kết thúc, không chuyển tiếp được nữa. Không cho phép set trạng thái tùy ý ngoài bảng này.
7. Không cho xóa `category`, `author`, `publisher` nếu còn `book` nào đang tham chiếu tới; không cho xóa `supplier` nếu còn `stock_import` nào tham chiếu tới — trả lỗi `409` với `error_code` tương ứng đã nêu ở từng mục.
8. Đăng xuất xử lý hoàn toàn ở phía client (xóa token khỏi `localStorage` + reset Pinia store) — không có API endpoint, không có bảng dữ liệu phía server cho việc này (xem mục 6.1).
9. Ảnh sách luôn lưu trên Cloudinary, KHÔNG lưu file trực tiếp trên ổ đĩa server. Khi xóa 1 ảnh (`DELETE /api/books/:id/images/:imageId`), bắt buộc phải gọi `cloudinary.uploader.destroy()` để xóa file thật trước, rồi mới xóa row trong `book_images` — tránh để lại ảnh rác trên Cloudinary không ai quản lý.
10. Tài khoản bị khóa (`is_active = 0`) không đăng nhập được (chặn ở `POST /api/auth/login`, trả `403 ACCOUNT_LOCKED`) — nhưng token đã phát hành trước đó vẫn còn hiệu lực kỹ thuật cho tới khi hết hạn, vì hệ thống không dùng blacklist token (đúng rule số 8). Không cho khóa tài khoản có `role = 'admin'` qua API `/api/users/:id/lock` (mục 6.11).
11. Mọi endpoint `GET` trả về danh sách đều phải tuân theo đúng quy ước phân trang chung ở mục 5 (`page`, `limit`, trả kèm object `pagination`) — không tạo ngoại lệ trả về nguyên mảng không phân trang, kể cả các module quản trị nội bộ như Categories, Authors, Publishers, Suppliers, Users.

---

## 10. Quy chuẩn giao diện (Design System)

> Mục này tồn tại để mọi trang được code ở các đợt khác nhau (có thể qua nhiều phiên làm việc với AI khác nhau) đều dùng chung 1 bộ màu/font/spacing — tránh tình trạng mỗi trang một kiểu do AI tự bịa ra giá trị khác nhau mỗi lần. AI code bất kỳ trang nào **phải tra cứu mục này trước**, không tự chọn màu/font ngoài danh sách dưới đây.

### 10.1. Định hướng thẩm mỹ

Chủ đề: hiệu sách trực tuyến hướng tới người đọc Việt Nam — cảm giác ấm áp, tin cậy như một tiệm sách vật lý, không lạnh lẽo kiểu tech dashboard thuần túy, nhưng vẫn rõ ràng mạch lạc vì đây là app CRUD nhiều bảng biểu/form. Tránh 2 thái cực: (1) màu mè, hiệu ứng động thừa thãi; (2) trắng đen mặc định không có điểm nhấn nào (nhìn "AI-generated" — nền `#F4F1EA` + cam đất `#D97757` là tổ hợp bị lạm dụng, KHÔNG dùng chính xác cặp màu này).

### 10.2. Bảng màu (Design Tokens)

| Tên token | Hex | Dùng cho |
|---|---|---|
| `primary` | `#2B3A67` | Header, nút hành động chính, link, sidebar admin — xanh navy đậm gợi cảm giác bìa sách cứng cổ điển |
| `primary-light` | `#4A5C8A` | Hover state của primary, badge phụ |
| `accent` | `#B8862F` | Điểm nhấn: giá tiền, nút CTA nổi bật ("Mua ngay", "Thêm vào giỏ"), icon quan trọng — vàng đồng gợi chữ mạ vàng trên gáy sách |
| `background` | `#F7F6F3` | Nền trang (KHÔNG dùng `#F4F1EA` — gần giống nhưng phải lệch tông để tránh trùng tổ hợp bị lạm dụng) |
| `surface` | `#FFFFFF` | Nền card, bảng, modal |
| `text-primary` | `#1E2233` | Chữ chính (không dùng đen tuyệt đối `#000000`) |
| `text-secondary` | `#6B7280` | Chữ phụ, placeholder, caption |
| `border` | `#E5E3DD` | Viền input, divider |
| `success` | `#2F855A` | Trạng thái tích cực: `paid`, `completed`, tài khoản đang hoạt động |
| `warning` | `#B7791F` | Trạng thái chờ: `pending`, `processing` |
| `info` | `#2C5282` | Trạng thái trung tính: `shipping` |
| `danger` | `#C53030` | Trạng thái tiêu cực: `cancelled`, tài khoản bị khóa, lỗi form |
| `danger-alt` | `#9C4221` | Trạng thái đặc biệt: `delivery_failed` (khác tông với `danger` để phân biệt "hủy" và "giao thất bại", theo yêu cầu ở mục 6.7) |

**Bảng màu badge trạng thái đơn hàng (áp dụng thống nhất mọi nơi hiển thị — OrderList, OrderManage, OrderStatus):**

| Status | Màu nền badge | Màu chữ | Nhãn tiếng Việt |
|---|---|---|---|
| `pending` | `warning` nhạt (`#FEF3C7`) | `warning` | Chờ xử lý |
| `paid` | `info` nhạt (`#DBEAFE`) | `info` | Đã thanh toán |
| `processing` | `primary-light` nhạt (`#E0E7FF`) | `primary` | Đang chuẩn bị |
| `shipping` | `accent` nhạt (`#FEF0D6`) | `accent` | Đang giao |
| `completed` | `success` nhạt (`#D1FAE5`) | `success` | Hoàn thành |
| `cancelled` | `danger` nhạt (`#FEE2E2`) | `danger` | Đã hủy |
| `delivery_failed` | `danger-alt` nhạt (`#FDEBD8`) | `danger-alt` | Giao không thành công |

### 10.3. Typography

- **Font tiêu đề** (h1-h3, tên sách nổi bật ở trang chủ/chi tiết): `Lora` (serif, gợi cảm giác sách in) — import từ Google Fonts.
- **Font nội dung** (toàn bộ còn lại — body, form, bảng, button): `Be Vietnam Pro` (sans-serif, hỗ trợ dấu tiếng Việt rõ nét, tránh tình trạng font lạ hiển thị dấu bị lỗi/xấu).
- Type scale (dùng nhất quán, không tự chế thêm size khác):

| Cấp | Size | Weight | Dùng cho |
|---|---|---|---|
| `h1` | 32px / 40px (mobile/desktop) | 600 | Tiêu đề trang (vd "Chi tiết sách") |
| `h2` | 24px / 28px | 600 | Tiêu đề section (vd "Sách liên quan") |
| `h3` | 18px / 20px | 600 | Tiêu đề card, tên sách trong grid |
| `body` | 15px | 400 | Nội dung mặc định |
| `small` | 13px | 400 | Caption, timestamp, ghi chú phụ |

### 10.4. Spacing, bo góc, đổ bóng

Dùng thang spacing mặc định của Tailwind (bội số của 4px: `p-2`(8px), `p-4`(16px), `p-6`(24px), `p-8`(32px)) — KHÔNG dùng giá trị px tùy tiện ngoài thang này.

- Bo góc: `rounded-lg` (8px) cho card/input/button, `rounded-full` cho badge/avatar.
- Đổ bóng: chỉ dùng `shadow-sm` cho card thường, `shadow-md` cho dropdown/modal — tránh đổ bóng đậm gây rối mắt.

### 10.5. Component patterns (áp dụng lại y hệt ở mọi trang, không tự chế mới)

- **Button chính** (`Đặt hàng`, `Lưu`, `Tạo mới`): nền `accent`, chữ trắng, `rounded-lg`, `px-4 py-2`, hover tối màu 10%.
- **Button phụ** (`Hủy`, `Quay lại`): viền `border`, nền trắng, chữ `text-primary`.
- **Button nguy hiểm** (`Xóa`, `Khóa tài khoản`): nền `danger`, chữ trắng — LUÔN kèm `confirm dialog` trước khi submit (đã quy định rải rác ở các prompt trước, giờ chuẩn hóa lại đây).
- **Input/Select**: viền `border`, `rounded-lg`, `px-3 py-2`, khi focus đổi viền sang `primary` (2px, có `outline` rõ ràng cho keyboard navigation — bắt buộc vì lý do accessibility).
- **Card sách** (trang Home/BookDetail): `surface` nền, `shadow-sm`, ảnh tỉ lệ `3:4` (tỉ lệ bìa sách thật), hover nâng nhẹ (`hover:shadow-md` + `hover:-translate-y-0.5`).
- **Bảng dữ liệu** (mọi trang *Manage.vue phía admin): header nền `background`, chữ `text-secondary` uppercase nhỏ, các dòng cách nhau bằng `border-b border-border` (không dùng zebra-stripe nhiều màu gây rối), hover dòng nền `background`.
- **Badge trạng thái**: `rounded-full`, `px-2.5 py-0.5`, chữ nhỏ (`text-xs`, weight 600) — màu theo đúng bảng 10.2.
- **Empty state** (giỏ hàng trống, chưa có sách...): icon/minh họa đơn giản + 1 câu mô tả ngắn bằng giọng điệu trung tính (không lỗi, không xin lỗi) + 1 hành động gợi ý rõ ràng (vd nút "Về trang chủ").
- **Pagination**: dùng chung 1 component `Pagination.vue` (đã yêu cầu ở đợt code trước) — nút Trước/Sau + số trang hiện tại/tổng trang, style theo Button phụ.
- **Toast/thông báo**: góc trên phải, tự ẩn sau ~3s, màu nền theo `success`/`danger` tương ứng loại thông báo.

### 10.6. Layout khung trang

- **Customer**: header cố định (logo bên trái, thanh tìm kiếm giữa, icon giỏ hàng + user menu bên phải) + nội dung + footer đơn giản (thông tin liên hệ, không cần cầu kỳ).
- **Admin**: sidebar cố định bên trái (danh sách các mục quản lý, đã liệt kê ở mục 2 — nhóm lại theo cụm: Sản phẩm (Books/Categories/Authors/Publishers), Kho (Suppliers/StockImports), Đơn hàng (OrderManage), Người dùng (CustomerManage)) + topbar nhỏ bên trên nội dung (tên admin đang đăng nhập + nút đăng xuất) + nội dung chính bên phải.

### 10.7. Responsive & Accessibility (bắt buộc, không tùy chọn)

- Mobile-first: mọi trang phải xem được ở màn hình 375px trở lên, sidebar admin thu gọn thành menu hamburger dưới breakpoint `md` (768px).
- Toàn bộ input/button phải có `focus:outline` hoặc `focus:ring` rõ ràng (không tắt outline mặc định của trình duyệt).
- Vùng bấm tối thiểu 44x44px trên mobile (nút, icon giỏ hàng, item trong danh sách).
- Ảnh luôn có `alt` mô tả (đặc biệt ảnh sách — dùng `title` sách làm `alt`).

### 10.8. Cấu hình Tailwind mẫu (để AI dùng luôn, không tự bịa giá trị khác)

```js
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2B3A67', light: '#4A5C8A' },
        accent: '#B8862F',
        background: '#F7F6F3',
        surface: '#FFFFFF',
        'text-primary': '#1E2233',
        'text-secondary': '#6B7280',
        border: '#E5E3DD',
        success: '#2F855A',
        warning: '#B7791F',
        info: '#2C5282',
        danger: '#C53030',
        'danger-alt': '#9C4221',
      },
      fontFamily: {
        display: ['Lora', 'serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
      },
    },
  },
  plugins: [],
};
```
