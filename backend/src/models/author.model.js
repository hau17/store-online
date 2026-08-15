// Model cho bảng authors (tác giả). Tách riêng khỏi books từ bản schema mới —
// books giờ chỉ lưu author_id (khóa ngoại) thay vì lưu thẳng tên tác giả dạng text.
const pool = require('../config/db');

// keyword (tùy chọn): tìm theo tên tác giả bằng LIKE
async function findAll({ keyword } = {}) {
  if (keyword && keyword.trim()) {
    const [rows] = await pool.execute(
      'SELECT * FROM authors WHERE name LIKE ? ORDER BY id ASC',
      [`%${keyword.trim()}%`]
    );
    return rows;
  }
  const [rows] = await pool.execute('SELECT * FROM authors ORDER BY id ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM authors WHERE id = ?', [id]);
  return rows[0];
}

async function create({ name, bio }) {
  const [result] = await pool.execute(
    'INSERT INTO authors (name, bio) VALUES (?, ?)',
    [name, bio || null]
  );
  return result.insertId;
}

async function update(id, { name, bio }) {
  const [result] = await pool.execute(
    'UPDATE authors SET name = ?, bio = ? WHERE id = ?',
    [name, bio || null, id]
  );
  return result.affectedRows > 0;
}

// Trước khi xóa: đếm xem còn sách nào tham chiếu author_id này không.
// Ném lỗi có sẵn statusCode/errorCode để error.middleware tự trả đúng response 409
// (cùng cách làm với categoryModel.remove).
async function remove(id) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM books WHERE author_id = ?',
    [id]
  );

  if (countRows[0].count > 0) {
    const err = new Error('Không thể xóa tác giả vì vẫn còn sách thuộc tác giả này');
    err.statusCode = 409;
    err.errorCode = 'AUTHOR_HAS_BOOKS';
    throw err;
  }

  const [result] = await pool.execute('DELETE FROM authors WHERE id = ?', [id]);
  return result.affectedRows > 0; // false nếu id không tồn tại
}

module.exports = { findAll, findById, create, update, remove };
