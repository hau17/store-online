// Model cho bảng authors (tác giả). Tách riêng khỏi books từ bản schema mới —
// books giờ chỉ lưu author_id (khóa ngoại) thay vì lưu thẳng tên tác giả dạng text.
const pool = require('../config/db');

// { keyword, page, limit } -> { items, total } — theo đúng quy ước phân trang chung mục 5.
async function findAll({ keyword, page = 1, limit = 10 } = {}) {
  const conditions = [];
  const params = [];

  if (keyword && keyword.trim()) {
    conditions.push('name LIKE ?');
    params.push(`%${keyword.trim()}%`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM authors ${whereSql}`, params);
  const total = countRows[0].total;

  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT * FROM authors ${whereSql} ORDER BY id ASC LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return { items: rows, total };
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM authors WHERE id = ?', [id]);
  return rows[0];
}

async function create({ name, bio }) {
  const [result] = await pool.execute(
    'INSERT INTO authors (name, bio) VALUES (?, ?)',
    [name, bio || null]
  );
  return result.insertId;
}

async function update(id, { name, bio }) {
  const [result] = await pool.execute(
    'UPDATE authors SET name = ?, bio = ? WHERE id = ?',
    [name, bio || null, id]
  );
  return result.affectedRows > 0;
}

// Trước khi xóa: đếm xem còn sách nào tham chiếu author_id này không.
// Ném lỗi có sẵn statusCode/errorCode để error.middleware tự trả đúng response 409
// (cùng cách làm với categoryModel.remove).
async function remove(id) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM books WHERE author_id = ?',
    [id]
  );

  if (countRows[0].count > 0) {
    const err = new Error('Không thể xóa tác giả vì vẫn còn sách thuộc tác giả này');
    err.statusCode = 409;
    err.errorCode = 'AUTHOR_HAS_BOOKS';
    throw err;
  }

  const [result] = await pool.execute('DELETE FROM authors WHERE id = ?', [id]);
  return result.affectedRows > 0; // false nếu id không tồn tại
}

module.exports = { findAll, findById, create, update, remove };
