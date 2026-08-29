// Model cho bảng suppliers (nhà cung cấp) — dùng cho chức năng nhập hàng, chỉ admin thao tác.
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

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM suppliers ${whereSql}`, params);
  const total = countRows[0].total;

  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT * FROM suppliers ${whereSql} ORDER BY id ASC LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return { items: rows, total };
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
  return rows[0];
}

async function create({ name, phone, email, address }) {
  const [result] = await pool.execute(
    'INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)',
    [name, phone || null, email || null, address || null]
  );
  return result.insertId;
}

async function update(id, { name, phone, email, address }) {
  const [result] = await pool.execute(
    'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
    [name, phone || null, email || null, address || null, id]
  );
  return result.affectedRows > 0;
}

// Trước khi xóa: đếm xem còn phiếu nhập hàng nào tham chiếu supplier_id này không.
async function remove(id) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM stock_imports WHERE supplier_id = ?',
    [id]
  );

  if (countRows[0].count > 0) {
    const err = new Error('Không thể xóa nhà cung cấp vì vẫn còn phiếu nhập hàng tham chiếu tới');
    err.statusCode = 409;
    err.errorCode = 'SUPPLIER_HAS_IMPORTS';
    throw err;
  }

  const [result] = await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
