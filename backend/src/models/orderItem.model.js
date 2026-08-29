const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM order_items');
  return rows;
}

// Lấy toàn bộ order_items của 1 đơn hàng (dùng để hiển thị chi tiết đơn)
async function findByOrderId(orderId) {
  const [rows] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM order_items WHERE id = ?', [id]);
  return rows[0];
}

// Bulk insert toàn bộ dòng sách của 1 đơn hàng bằng 1 câu query (giống stockImportItem.model.js).
// book_title/price phải được SNAPSHOT SẴN trong items trước khi gọi (business rule #2) — hàm này
// chỉ lo phần ghi DB, không tự lấy giá hiện tại của book.
// conn (tùy chọn): dùng chung transaction với order.controller.js lúc checkout.
async function createMany(orderId, items, conn = pool) {
  const values = items.map((item) => [orderId, item.book_id, item.book_title, item.quantity, item.price]);
  await conn.query(
    'INSERT INTO order_items (order_id, book_id, book_title, quantity, price) VALUES ?',
    [values]
  );
}

// book_title và price được snapshot tại thời điểm đặt hàng (xem business rule #2 trong spec)
async function create({ order_id, book_id, book_title, quantity, price }) {
  const [result] = await pool.execute(
    `INSERT INTO order_items (order_id, book_id, book_title, quantity, price)
     VALUES (?, ?, ?, ?, ?)`,
    [order_id, book_id, book_title, quantity, price]
  );
  return result.insertId;
}

async function update(id, { quantity, price }) {
  const [result] = await pool.execute(
    'UPDATE order_items SET quantity = ?, price = ? WHERE id = ?',
    [quantity, price, id]
  );
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM order_items WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findByOrderId, findById, create, createMany, update, remove };
