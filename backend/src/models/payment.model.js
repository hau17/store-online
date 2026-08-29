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

// conn (tùy chọn): dùng chung transaction với order.controller.js lúc checkout (bước i mục 6.7).
async function create({ order_id, amount, gateway, transfer_content }, conn = pool) {
  const [result] = await conn.execute(
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

// Update LINH HOẠT — chỉ set field nào thực sự được truyền vào (khác update() ở trên đòi hỏi đủ
// mọi field). Dùng cho webhook SePay: tình huống "lệch số tiền" chỉ cần đổi status + raw_payload,
// không có paid_at/gateway_transaction_id; tình huống "khớp tiền" thì set đủ cả 5 field.
// conn (tùy chọn): dùng chung transaction với payment.controller.js lúc xác nhận thanh toán khớp tiền.
async function updateStatus(id, { status, paid_at, gateway_transaction_id, transfer_content, raw_payload }, conn = pool) {
  const fields = [];
  const params = [];

  if (status !== undefined) {
    fields.push('status = ?');
    params.push(status);
  }
  if (paid_at !== undefined) {
    fields.push('paid_at = ?');
    params.push(paid_at);
  }
  if (gateway_transaction_id !== undefined) {
    fields.push('gateway_transaction_id = ?');
    params.push(gateway_transaction_id);
  }
  if (transfer_content !== undefined) {
    fields.push('transfer_content = ?');
    params.push(transfer_content);
  }
  if (raw_payload !== undefined) {
    fields.push('raw_payload = ?');
    params.push(JSON.stringify(raw_payload));
  }

  if (fields.length === 0) return false;

  params.push(id);
  const [result] = await conn.execute(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByOrderId, create, update, updateStatus, remove };
