const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM payments');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM payments WHERE id = ?', [id]);
  return rows[0];
}

async function findByOrderId(orderId) {
  const [rows] = await pool.execute('SELECT * FROM payments WHERE order_id = ?', [orderId]);
  return rows[0];
}

async function create({ order_id, amount, gateway, transfer_content }) {
  const [result] = await pool.execute(
    `INSERT INTO payments (order_id, amount, gateway, transfer_content)
     VALUES (?, ?, ?, ?)`,
    [order_id, amount, gateway || 'sepay', transfer_content || null]
  );
  return result.insertId;
}

// Dùng để cập nhật khi webhook SePay xác nhận thanh toán (làm chi tiết ở bước code logic sau)
async function update(id, { status, gateway_transaction_id, transfer_content, raw_payload, paid_at }) {
  const [result] = await pool.execute(
    `UPDATE payments SET
       status = ?, gateway_transaction_id = ?, transfer_content = ?, raw_payload = ?, paid_at = ?
     WHERE id = ?`,
    [
      status,
      gateway_transaction_id || null,
      transfer_content || null,
      raw_payload ? JSON.stringify(raw_payload) : null,
      paid_at || null,
      id,
    ]
  );
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM payments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByOrderId, create, update, remove };
