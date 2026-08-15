// Model cho bảng stock_imports (phiếu nhập hàng — header). Chi tiết từng dòng sách nằm ở
// stockImportItem.model.js. Không có update()/remove() — phiếu nhập không cho sửa/xóa (xem spec mục 6.10).
const pool = require('../config/db');

const SELECT_COLUMNS = `
  si.*, s.name AS supplier_name, u.full_name AS created_by_name
`;
const JOIN_SQL = `
  JOIN suppliers s ON si.supplier_id = s.id
  JOIN users u ON si.created_by = u.id
`;

// Gộp field supplier/created_by thành object lồng { id, name } cho gọn, giống cách book.model.js
// đang làm với category/author/publisher.
function formatRow(row) {
  return {
    id: row.id,
    import_code: row.import_code,
    total_amount: row.total_amount,
    note: row.note,
    created_at: row.created_at,
    supplier: { id: row.supplier_id, name: row.supplier_name },
    created_by: { id: row.created_by, full_name: row.created_by_name },
  };
}

// { supplier_id, from_date, to_date, page, limit } -> { items, total }
async function findAll({ supplier_id, from_date, to_date, page = 1, limit = 10 } = {}) {
  const conditions = [];
  const params = [];

  const supplierIdNum = Number(supplier_id);
  if (supplier_id && Number.isInteger(supplierIdNum) && supplierIdNum > 0) {
    conditions.push('si.supplier_id = ?');
    params.push(supplierIdNum);
  }
  // from_date/to_date dạng "YYYY-MM-DD" (input type="date" ở FE) -> so sánh trực tiếp với DATE(created_at)
  if (from_date) {
    conditions.push('DATE(si.created_at) >= ?');
    params.push(from_date);
  }
  if (to_date) {
    conditions.push('DATE(si.created_at) <= ?');
    params.push(to_date);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM stock_imports si ${whereSql}`,
    params
  );
  const total = countRows[0].total;

  // Ép kiểu number thủ công cho limit/offset (giống book.model.js) vì LIMIT ? OFFSET ? qua
  // prepared statement không ổn định ở vài phiên bản mysql2. Đã ép Number() + có fallback mặc định
  // nên không có rủi ro SQL injection.
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM stock_imports si
     ${JOIN_SQL}
     ${whereSql}
     ORDER BY si.created_at DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return { items: rows.map(formatRow), total };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM stock_imports si ${JOIN_SQL} WHERE si.id = ?`,
    [id]
  );
  if (!rows[0]) return undefined;
  return formatRow(rows[0]);
}

// conn (tùy chọn): connection đang trong transaction của stockImport.controller.js, để insert phiếu
// nhập, insert chi tiết và cộng tồn kho cùng nằm chung 1 transaction. Mặc định dùng pool nếu gọi
// ngoài transaction (hiện tại luôn được gọi kèm conn, để sẵn tham số cho nhất quán với các model khác).
async function create({ import_code, supplier_id, created_by, total_amount, note }, conn = pool) {
  const [result] = await conn.execute(
    `INSERT INTO stock_imports (import_code, supplier_id, created_by, total_amount, note)
     VALUES (?, ?, ?, ?, ?)`,
    [import_code, supplier_id, created_by, total_amount, note || null]
  );
  return result.insertId;
}

module.exports = { findAll, findById, create };
