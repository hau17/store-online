// Model cho bảng publishers (nhà xuất bản). Cùng cấu trúc với author.model.js.
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

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM publishers ${whereSql}`, params);
  const total = countRows[0].total;

  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT * FROM publishers ${whereSql} ORDER BY id ASC LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return { items: rows, total };
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM publishers WHERE id = ?', [id]);
  return rows[0];
}

async function create({ name, address }) {
  const [result] = await pool.execute(
    'INSERT INTO publishers (name, address) VALUES (?, ?)',
    [name, address || null]
  );
  return result.insertId;
}

async function update(id, { name, address }) {
  const [result] = await pool.execute(
    'UPDATE publishers SET name = ?, address = ? WHERE id = ?',
    [name, address || null, id]
  );
  return result.affectedRows > 0;
}

// Trước khi xóa: đếm xem còn sách nào tham chiếu publisher_id này không.
async function remove(id) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM books WHERE publisher_id = ?',
    [id]
  );

  if (countRows[0].count > 0) {
    const err = new Error('Không thể xóa nhà xuất bản vì vẫn còn sách thuộc nhà xuất bản này');
    err.statusCode = 409;
    err.errorCode = 'PUBLISHER_HAS_BOOKS';
    throw err;
  }

  const [result] = await pool.execute('DELETE FROM publishers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
