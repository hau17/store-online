const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM order_status_history');
  return rows;
}

// Lấy lịch sử trạng thái của 1 đơn hàng, mới nhất trước
async function findByOrderId(orderId) {
  const [rows] = await pool.execute(
    'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
    [orderId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM order_status_history WHERE id = ?', [id]);
  return rows[0];
}

async function create({ order_id, status, changed_by, note }) {
  const [result] = await pool.execute(
    `INSERT INTO order_status_history (order_id, status, changed_by, note)
     VALUES (?, ?, ?, ?)`,
    [order_id, status, changed_by || 'system', note || null]
  );
  return result.insertId;
}

// Bảng này chỉ dùng để ghi log lịch sử, không có nghiệp vụ update — giữ cho đủ CRUD cơ bản.
async function update(id, { status, note }) {
  const [result] = await pool.execute(
    'UPDATE order_status_history SET status = ?, note = ? WHERE id = ?',
    [status, note || null, id]
  );
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM order_status_history WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findByOrderId, findById, create, update, remove };
