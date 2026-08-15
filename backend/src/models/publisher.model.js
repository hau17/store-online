// Model cho bảng publishers (nhà xuất bản). Cùng cấu trúc với author.model.js.
const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM publishers ORDER BY id ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM publishers WHERE id = ?', [id]);
  return rows[0];
}

async function create({ name, address }) {
  const [result] = await pool.execute(
    'INSERT INTO publishers (name, address) VALUES (?, ?)',
    [name, address || null]
  );
  return result.insertId;
}

async function update(id, { name, address }) {
  const [result] = await pool.execute(
    'UPDATE publishers SET name = ?, address = ? WHERE id = ?',
    [name, address || null, id]
  );
  return result.affectedRows > 0;
}

// Trước khi xóa: đếm xem còn sách nào tham chiếu publisher_id này không.
async function remove(id) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM books WHERE publisher_id = ?',
    [id]
  );

  if (countRows[0].count > 0) {
    const err = new Error('Không thể xóa nhà xuất bản vì vẫn còn sách thuộc nhà xuất bản này');
    err.statusCode = 409;
    err.errorCode = 'PUBLISHER_HAS_BOOKS';
    throw err;
  }

  const [result] = await pool.execute('DELETE FROM publishers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
