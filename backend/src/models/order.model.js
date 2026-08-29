const pool = require('../config/db');
const orderStatusHistoryModel = require('./orderStatusHistory.model');

// conn (tùy chọn): dùng chung transaction với order.controller.js lúc checkout (mục 6.7).
async function create(
  {
    order_code,
    user_id,
    total_amount,
    payment_method,
    shipping_name,
    shipping_phone,
    shipping_address,
    note,
  },
  conn = pool
) {
  const [result] = await conn.execute(
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

// Nếu all=true VÀ isAdmin=true -> lấy TOÀN BỘ đơn hàng (không filter user_id), dùng cho trang
// quản trị (kèm status/keyword để lọc thêm theo trạng thái hoặc tìm theo mã đơn/tên khách). Ngược
// lại luôn chỉ lấy đơn của đúng userId — kể cả khi client cố gửi ?all=true lúc không phải admin,
// vì isAdmin được controller tự xác định từ req.user.role (server-side), không đọc trực tiếp từ
// query string, nên không thể giả mạo để xem đơn người khác.
async function findByUserId(
  userId,
  { all = false, isAdmin = false, status, from_date, to_date, keyword, page = 1, limit = 10 } = {}
) {
  const showAll = all && isAdmin;
  const conditions = [];
  const params = [];

  if (!showAll) {
    conditions.push('o.user_id = ?');
    params.push(userId);
  }
  if (status) {
    conditions.push('o.status = ?');
    params.push(status);
  }
  if (from_date) {
    conditions.push('DATE(o.created_at) >= ?');
    params.push(from_date);
  }
  if (to_date) {
    conditions.push('DATE(o.created_at) <= ?');
    params.push(to_date);
  }
  // keyword: khách chỉ tìm theo order_code; admin (showAll) tìm thêm cả shipping_name (mục 6.7)
  if (keyword && keyword.trim()) {
    const likeKeyword = `%${keyword.trim()}%`;
    if (showAll) {
      conditions.push('(o.order_code LIKE ? OR o.shipping_name LIKE ?)');
      params.push(likeKeyword, likeKeyword);
    } else {
      conditions.push('o.order_code LIKE ?');
      params.push(likeKeyword);
    }
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`, params);
  const total = countRows[0].total;

  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT o.* FROM orders o ${whereSql} ORDER BY o.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return { items: rows, total };
}

// Kèm tên/sđt người đặt (để admin xem là đơn của ai) và JOIN payments nếu có (để lấy lại
// transfer_content/status thanh toán). LEFT JOIN vì đơn COD sẽ không có dòng payments nào.
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT o.*, u.full_name AS customer_name, u.phone AS customer_phone,
            p.id AS payment_id, p.status AS payment_status, p.transfer_content AS payment_transfer_content
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = ?`,
    [id]
  );
  if (!rows[0]) return undefined;

  const row = rows[0];

  // Timeline lịch sử trạng thái (mới nhất trước) — để trang chi tiết đơn (customer + admin) hiển thị
  // các mốc đã đổi trạng thái, không cần FE gọi thêm 1 API riêng.
  const statusHistory = await orderStatusHistoryModel.findByOrderId(id);

  return {
    id: row.id,
    order_code: row.order_code,
    user_id: row.user_id,
    total_amount: row.total_amount,
    status: row.status,
    payment_method: row.payment_method,
    shipping_name: row.shipping_name,
    shipping_phone: row.shipping_phone,
    shipping_address: row.shipping_address,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: { full_name: row.customer_name, phone: row.customer_phone },
    payment: row.payment_id
      ? { id: row.payment_id, status: row.payment_status, transfer_content: row.payment_transfer_content }
      : null,
    status_history: statusHistory.map((h) => ({ status: h.status, changed_by: h.changed_by, note: h.note, created_at: h.created_at })),
  };
}

// Dùng cho webhook SePay ở bước sau (viết sẵn để không phải quay lại sửa model).
async function findByOrderCode(orderCode) {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE order_code = ?', [orderCode]);
  return rows[0];
}

async function updateStatus(id, status, conn = pool) {
  const [result] = await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows > 0;
}

// Dùng cho GET /api/orders/:id/status — nhẹ hơn findById vì chỉ cần đúng 1 cột.
async function getStatus(id) {
  const [rows] = await pool.execute('SELECT status FROM orders WHERE id = ?', [id]);
  return rows[0]?.status;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, findByUserId, findById, findByOrderCode, updateStatus, getStatus, remove };
