// Model cho bảng categories. Không có cột is_active trong schema nên category chỉ có thể
// tồn tại hoặc bị xóa hẳn — chính vì vậy remove() phải chặn xóa khi còn sách tham chiếu tới,
// tránh để lại book.category_id trỏ tới 1 category không còn tồn tại (orphan data).
const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM categories ORDER BY id ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0];
}

async function findBySlug(slug) {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE slug = ?', [slug]);
  return rows[0];
}

async function create({ name, slug, description }) {
  const [result] = await pool.execute(
    `INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)`,
    [name, slug, description || null]
  );
  return result.insertId;
}

async function update(id, { name, slug, description }) {
  const [result] = await pool.execute(
    `UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?`,
    [name, slug, description || null, id]
  );
  return result.affectedRows > 0;
}

// Trước khi xóa: đếm xem còn sách nào thuộc category này không.
// Nếu còn -> ném lỗi có sẵn statusCode/errorCode để error.middleware tự trả đúng response 409,
// controller không cần viết lại logic kiểm tra này.
async function remove(id) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM books WHERE category_id = ?',
    [id]
  );

  if (countRows[0].count > 0) {
    const err = new Error('Không thể xóa danh mục vì vẫn còn sách thuộc danh mục này');
    err.statusCode = 409;
    err.errorCode = 'CATEGORY_HAS_BOOKS';
    throw err;
  }

  const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  return result.affectedRows > 0; // false nếu id không tồn tại
}

module.exports = { findAll, findById, findBySlug, create, update, remove };
