// Model cho bảng book_images: 1 sách có nhiều ảnh, ảnh thật lưu trên Cloudinary,
// bảng này chỉ giữ URL + public_id (để sau này xóa ảnh trên Cloudinary) + đánh dấu ảnh đại diện.
const pool = require('../config/db');

// Toàn bộ ảnh của 1 sách, sắp theo display_order (dùng cho gallery ở trang chi tiết)
async function findByBookId(bookId) {
  const [rows] = await pool.execute(
    'SELECT * FROM book_images WHERE book_id = ? ORDER BY display_order ASC, id ASC',
    [bookId]
  );
  return rows;
}

// Ảnh đại diện (is_primary = 1) của 1 sách — dùng khi chỉ cần 1 ảnh để hiển thị (vd trang chi tiết)
async function findPrimaryByBookId(bookId) {
  const [rows] = await pool.execute(
    'SELECT * FROM book_images WHERE book_id = ? AND is_primary = 1 LIMIT 1',
    [bookId]
  );
  return rows[0];
}

// Lấy ảnh đại diện cho NHIỀU sách cùng lúc trong 1 query duy nhất (tránh N+1 query khi trả
// danh sách sách ở GET /api/books — nếu query riêng cho từng sách thì N sách sẽ tốn N query).
// Trả về Map<book_id, image_url> để nơi gọi tự tra cứu, sách nào không có trong Map nghĩa là
// chưa có ảnh nào được đánh dấu primary (kể cả chưa có ảnh nào).
async function findPrimaryForBooks(bookIds) {
  if (!bookIds || bookIds.length === 0) return new Map();

  const placeholders = bookIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT book_id, image_url FROM book_images WHERE book_id IN (${placeholders}) AND is_primary = 1`,
    bookIds
  );

  const map = new Map();
  for (const row of rows) {
    map.set(row.book_id, row.image_url);
  }
  return map;
}

async function findById(imageId) {
  const [rows] = await pool.execute('SELECT * FROM book_images WHERE id = ?', [imageId]);
  return rows[0]; // có sẵn book_id trong row để controller kiểm tra ảnh có đúng thuộc sách đang thao tác không
}

async function countByBookId(bookId) {
  const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM book_images WHERE book_id = ?', [bookId]);
  return rows[0].count;
}

async function create({ book_id, image_url, cloudinary_public_id, is_primary, display_order }) {
  const [result] = await pool.execute(
    `INSERT INTO book_images (book_id, image_url, cloudinary_public_id, is_primary, display_order)
     VALUES (?, ?, ?, ?, ?)`,
    [book_id, image_url, cloudinary_public_id, is_primary ? 1 : 0, display_order || 0]
  );
  return result.insertId;
}

async function remove(imageId) {
  const [result] = await pool.execute('DELETE FROM book_images WHERE id = ?', [imageId]);
  return result.affectedRows > 0;
}

// Bỏ is_primary của TOÀN BỘ ảnh thuộc 1 sách — dùng trước khi gán primary cho 1 ảnh khác,
// đảm bảo tại một thời điểm mỗi sách chỉ có tối đa 1 ảnh primary.
// Tham số conn (tùy chọn): truyền vào 1 connection đã beginTransaction() để chạy chung transaction
// với setPrimary() bên dưới (xem bookImage.controller.js setPrimaryImage) — mặc định dùng pool
// chung nếu không cần transaction (vd không dùng ở đâu khác hiện tại nhưng để sẵn cho nhất quán).
async function unsetPrimaryByBookId(bookId, conn = pool) {
  await conn.execute('UPDATE book_images SET is_primary = 0 WHERE book_id = ?', [bookId]);
}

async function setPrimary(imageId, conn = pool) {
  await conn.execute('UPDATE book_images SET is_primary = 1 WHERE id = ?', [imageId]);
}

// Ảnh còn lại đầu tiên (theo display_order) của 1 sách — dùng để tự động gán primary mới
// ngay sau khi ảnh primary cũ vừa bị xóa.
async function findFirstRemainingByBookId(bookId) {
  const [rows] = await pool.execute(
    'SELECT * FROM book_images WHERE book_id = ? ORDER BY display_order ASC, id ASC LIMIT 1',
    [bookId]
  );
  return rows[0];
}

module.exports = {
  findByBookId,
  findPrimaryByBookId,
  findPrimaryForBooks,
  findById,
  countByBookId,
  create,
  remove,
  unsetPrimaryByBookId,
  setPrimary,
  findFirstRemainingByBookId,
};
