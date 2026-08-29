// Model cho bảng cart_items. Giỏ hàng luôn thao tác theo cặp (user_id, book_id) nhờ UNIQUE KEY
// uq_user_book đã có sẵn trong schema, nên không cần dùng cart_items.id ở tầng nghiệp vụ.
const pool = require('../config/db');
const bookImageModel = require('./bookImage.model');

// Toàn bộ giỏ hàng của 1 user, JOIN books lấy title/price/stock_quantity hiện tại, gắn thêm
// primary_image_url (batch query 1 lần cho cả giỏ, tái sử dụng bookImage.model.js — tránh N+1
// giống cách book.model.js findAll đang làm).
//
// conn (tùy chọn): truyền connection đang trong transaction của order.controller.js khi hàm này
// được gọi lại lúc checkout (bước a mục 6.7), để việc đọc giỏ hàng + stock_quantity nằm chung
// transaction với các bước ghi phía sau — mặc định dùng pool khi gọi bình thường ở GET /api/cart.
async function findByUserId(userId, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT ci.book_id, ci.quantity, b.title, b.price, b.stock_quantity
     FROM cart_items ci
     JOIN books b ON ci.book_id = b.id
     WHERE ci.user_id = ?
     ORDER BY ci.created_at DESC`,
    [userId]
  );

  const bookIds = rows.map((row) => row.book_id);
  const primaryImageMap = await bookImageModel.findPrimaryForBooks(bookIds);

  return rows.map((row) => ({
    book_id: row.book_id,
    title: row.title,
    price: row.price,
    quantity: row.quantity,
    stock_quantity: row.stock_quantity,
    primary_image_url: primaryImageMap.get(row.book_id) || null,
  }));
}

// Thêm sách vào giỏ. Nếu sách đã có trong giỏ (theo UNIQUE KEY uq_user_book) thì CỘNG DỒN số
// lượng thay vì tạo dòng mới. TRƯỚC KHI ghi, kiểm tra tổng số lượng sau khi cộng dồn không được
// vượt tồn kho hiện có — không insert/update nếu vượt.
async function upsert(userId, bookId, quantity) {
  const [bookRows] = await pool.execute(
    'SELECT stock_quantity FROM books WHERE id = ? AND is_active = 1',
    [bookId]
  );
  const book = bookRows[0];
  if (!book) {
    const err = new Error('Sách không tồn tại hoặc đã ngừng bán');
    err.statusCode = 404;
    err.errorCode = 'BOOK_NOT_FOUND';
    throw err;
  }

  const [existingRows] = await pool.execute(
    'SELECT quantity FROM cart_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  const currentQuantity = existingRows[0]?.quantity || 0;

  if (currentQuantity + quantity > book.stock_quantity) {
    const err = new Error(
      `Số lượng vượt quá tồn kho (còn lại ${book.stock_quantity}, giỏ hàng đã có ${currentQuantity})`
    );
    err.statusCode = 400;
    err.errorCode = 'OUT_OF_STOCK';
    throw err;
  }

  await pool.execute(
    `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [userId, bookId, quantity]
  );
}

// Set THẲNG số lượng (không cộng dồn) — dùng khi người dùng bấm +/- hoặc nhập tay ở Cart.vue.
async function updateQuantity(userId, bookId, quantity) {
  const [bookRows] = await pool.execute('SELECT stock_quantity FROM books WHERE id = ?', [bookId]);
  const book = bookRows[0];
  if (!book) {
    const err = new Error('Sách không tồn tại');
    err.statusCode = 404;
    err.errorCode = 'BOOK_NOT_FOUND';
    throw err;
  }

  if (quantity > book.stock_quantity) {
    const err = new Error(`Số lượng vượt quá tồn kho (còn lại ${book.stock_quantity})`);
    err.statusCode = 400;
    err.errorCode = 'OUT_OF_STOCK';
    throw err;
  }

  const [result] = await pool.execute(
    'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND book_id = ?',
    [quantity, userId, bookId]
  );
  return result.affectedRows > 0;
}

async function removeItem(userId, bookId) {
  const [result] = await pool.execute(
    'DELETE FROM cart_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  return result.affectedRows > 0;
}

// conn (tùy chọn): dùng chung transaction khi được gọi từ order.controller.js sau khi tạo đơn
// xong (bước h mục 6.7) — mặc định dùng pool khi gọi trực tiếp từ DELETE /api/cart.
async function clearCart(userId, conn = pool) {
  await conn.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
}

module.exports = { findByUserId, upsert, updateQuantity, removeItem, clearCart };
