// Model = tập hợp các hàm thao tác trực tiếp với 1 bảng trong DB bằng raw SQL.
// Dùng pool.execute() với dấu "?" (prepared statement) để mysql2 tự escape giá trị,
// tránh SQL injection thay vì nối chuỗi thủ công.
const pool = require('../config/db');

// Lấy toàn bộ user
async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM users');
  return rows;
}

// Tìm 1 user theo id — KHÔNG select cột password vì hàm này dùng để trả dữ liệu
// ra ngoài response (vd GET /api/auth/me), tuyệt đối không để lộ password (dù đã hash).
async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, full_name, email, phone, address, role, is_active, created_at, updated_at
     FROM users WHERE id = ?`,
    [id]
  );
  return rows[0]; // trả undefined nếu không tìm thấy
}

// Tìm 1 user theo email (dùng khi đăng ký/đăng nhập).
// Hàm này CẦN trả về cả password (dạng đã hash) để controller so sánh lúc login,
// nên không lược bớt cột như findById.
async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
}

// Tạo user mới, trả về id vừa insert
async function create({ full_name, email, password, phone, address, role }) {
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password, phone, address, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [full_name, email, password, phone || null, address || null, role || 'customer']
  );
  return result.insertId;
}

// Tạo user cho luồng đăng ký (register): luôn role = 'customer', không có address.
// Tách riêng khỏi create() để controller auth gọi đúng ý nghĩa nghiệp vụ, dễ đọc hơn.
async function createUser({ full_name, email, password, phone }) {
  return create({ full_name, email, password, phone, role: 'customer' });
}

// Cập nhật thông tin user theo id
async function update(id, { full_name, phone, address, is_active }) {
  const [result] = await pool.execute(
    `UPDATE users SET full_name = ?, phone = ?, address = ?, is_active = ?
     WHERE id = ?`,
    [full_name, phone || null, address || null, is_active, id]
  );
  return result.affectedRows > 0;
}

// Xóa user theo id
async function remove(id) {
  const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Dùng riêng cho đổi mật khẩu (changeMyPassword) — CẦN có password (hash) để so sánh bằng
// bcrypt.compare, khác với findById() ở trên luôn loại bỏ cột này khỏi kết quả.
async function findByIdWithPassword(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
}

// Cập nhật hồ sơ cá nhân — CHỈ 3 field full_name/phone/address, không đụng email/role/password
// (mục 6.1). Update linh hoạt: field nào không truyền (undefined) thì giữ nguyên giá trị cũ,
// tránh trường hợp truyền thiếu field làm mất dữ liệu field khác.
async function updateProfile(userId, { full_name, phone, address }) {
  const fields = [];
  const params = [];

  if (full_name !== undefined) {
    fields.push('full_name = ?');
    params.push(full_name);
  }
  if (phone !== undefined) {
    fields.push('phone = ?');
    params.push(phone || null);
  }
  if (address !== undefined) {
    fields.push('address = ?');
    params.push(address || null);
  }

  if (fields.length === 0) return false;

  params.push(userId);
  const [result] = await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

// Đổi mật khẩu — nhận sẵn hash mới (đã bcrypt.hash ở controller), model chỉ lo ghi DB.
async function updatePassword(userId, newHashedPassword) {
  const [result] = await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId]);
  return result.affectedRows > 0;
}

// ===== Mục 6.11: admin quản lý khách hàng =====

// keyword: LIKE trên full_name HOẶC email. status: 'active' (is_active=1) | 'locked' (is_active=0)
// | bỏ trống = tất cả. Luôn ép role='customer' (không lẫn tài khoản admin khác vào danh sách này).
// total_orders đếm bằng subquery tương quan (correlated subquery) thay vì JOIN + GROUP BY — đơn
// giản hơn khi chỉ cần thêm đúng 1 cột phụ, không ảnh hưởng các cột chính đang SELECT.
async function findAllCustomers({ keyword, status, page = 1, limit = 10 } = {}) {
  const conditions = ["role = 'customer'"];
  const params = [];

  if (keyword && keyword.trim()) {
    const likeKeyword = `%${keyword.trim()}%`;
    conditions.push('(full_name LIKE ? OR email LIKE ?)');
    params.push(likeKeyword, likeKeyword);
  }
  if (status === 'active') conditions.push('is_active = 1');
  else if (status === 'locked') conditions.push('is_active = 0');

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
  const total = countRows[0].total;

  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, address, is_active, created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = users.id) AS total_orders
     FROM users
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return { items: rows, total };
}

async function findCustomerById(id) {
  const [rows] = await pool.execute(
    `SELECT id, full_name, email, phone, address, is_active, created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = users.id) AS total_orders
     FROM users
     WHERE id = ? AND role = 'customer'`,
    [id]
  );
  return rows[0];
}

async function lockUser(id) {
  const [result] = await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function unlockUser(id) {
  const [result] = await pool.execute('UPDATE users SET is_active = 1 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Dùng để kiểm tra "không cho khóa tài khoản admin" trước khi khóa (mục 6.11)
async function findRoleById(id) {
  const [rows] = await pool.execute('SELECT role FROM users WHERE id = ?', [id]);
  return rows[0]?.role;
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  findByIdWithPassword,
  create,
  createUser,
  update,
  updateProfile,
  updatePassword,
  remove,
  findAllCustomers,
  findCustomerById,
  lockUser,
  unlockUser,
  findRoleById,
};
