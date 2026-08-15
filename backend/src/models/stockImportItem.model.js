// Model cho bảng stock_import_items (chi tiết từng dòng sách trong 1 phiếu nhập hàng).
const pool = require('../config/db');

// Insert nhiều dòng cùng lúc bằng 1 câu query duy nhất (bulk insert) thay vì lặp INSERT từng dòng
// -> nhanh hơn khi phiếu nhập có nhiều sách. Cú pháp "VALUES ?" của mysql2 nhận 1 mảng các mảng con
// [[stock_import_id, book_id, quantity, import_price], ...] rồi tự nối thành nhiều dòng.
// LƯU Ý: "VALUES ?" chỉ dùng được với conn.query(), KHÔNG dùng được với conn.execute() (prepared
// statement không hỗ trợ kiểu placeholder mở rộng động này).
async function createMany(stockImportId, items, conn = pool) {
  const values = items.map((item) => [stockImportId, item.book_id, item.quantity, item.import_price]);
  await conn.query(
    'INSERT INTO stock_import_items (stock_import_id, book_id, quantity, import_price) VALUES ?',
    [values]
  );
}

// Toàn bộ items của 1 phiếu nhập, JOIN books lấy tên sách HIỆN TẠI (không snapshot vì đây là phiếu
// nội bộ giữa admin - nhà cung cấp, không phải đơn hàng khách nên không cần giữ đúng tên tại thời điểm nhập).
async function findByStockImportId(stockImportId) {
  const [rows] = await pool.query(
    `SELECT sii.*, b.title AS book_title
     FROM stock_import_items sii
     JOIN books b ON sii.book_id = b.id
     WHERE sii.stock_import_id = ?`,
    [stockImportId]
  );
  return rows;
}

module.exports = { createMany, findByStockImportId };
