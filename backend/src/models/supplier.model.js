// Model cho bảng suppliers (nhà cung cấp) — dùng cho chức năng nhập hàng, chỉ admin thao tác.
const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM suppliers ORDER BY id ASC');
  return rows;
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
