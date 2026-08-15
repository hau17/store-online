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

module.exports = { findAll, findById, findByEmail, create, createUser, update, remove };
