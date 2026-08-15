const pool = require('../config/db');

// Lấy toàn bộ cart_items của 1 user (không phải findAll toàn bảng vì cart luôn gắn với user)
async function findAll(userId) {
  const [rows] = await pool.execute('SELECT * FROM cart_items WHERE user_id = ?', [userId]);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM cart_items WHERE id = ?', [id]);
  return rows[0];
}

// Tìm theo cặp user_id + book_id (dùng UNIQUE KEY uq_user_book trong schema)
async function findByUserAndBook(userId, bookId) {
  const [rows] = await pool.execute(
    'SELECT * FROM cart_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  return rows[0];
}

async function create({ user_id, book_id, quantity }) {
  const [result] = await pool.execute(
    `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)`,
    [user_id, book_id, quantity]
  );
  return result.insertId;
}

async function update(id, { quantity }) {
  const [result] = await pool.execute(
    'UPDATE cart_items SET quantity = ? WHERE id = ?',
    [quantity, id]
  );
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM cart_items WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Xóa toàn bộ giỏ hàng của 1 user (dùng cho DELETE /api/cart và sau khi checkout)
async function removeAllByUser(userId) {
  const [result] = await pool.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  return result.affectedRows;
}

module.exports = {
  findAll,
  findById,
  findByUserAndBook,
  create,
  update,
  remove,
  removeAllByUser,
};
