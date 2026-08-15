const pool = require('../config/db');

// Logic checkout phức tạp (transaction, sinh order_code...) sẽ làm ở bước code logic sau.
// Ở đây chỉ có CRUD cơ bản.
async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM orders');
  return rows;
}

async function findAllByUser(userId) {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ?', [userId]);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
  return rows[0];
}

async function findByOrderCode(orderCode) {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE order_code = ?', [orderCode]);
  return rows[0];
}

async function create({
  order_code,
  user_id,
  total_amount,
  payment_method,
  shipping_name,
  shipping_phone,
  shipping_address,
  note,
}) {
  const [result] = await pool.execute(
    `INSERT INTO orders
       (order_code, user_id, total_amount, payment_method, shipping_name, shipping_phone, shipping_address, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order_code,
      user_id,
      total_amount,
      payment_method,
      shipping_name,
      shipping_phone,
      shipping_address,
      note || null,
    ]
  );
  return result.insertId;
}

async function update(id, { status, note }) {
  const [result] = await pool.execute(
    'UPDATE orders SET status = ?, note = ? WHERE id = ?',
    [status, note || null, id]
  );
  return result.affectedRows > 0;
}

// Đổi trạng thái đơn hàng (dùng riêng ở bước code logic sau khi xử lý webhook/admin update)
async function updateStatus(id, status) {
  const [result] = await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findAllByUser,
  findById,
  findByOrderCode,
  create,
  update,
  updateStatus,
  remove,
};
