const pool = require('../config/db');
const bookImageModel = require('./bookImage.model');

// Chuyển 1 row SQL (đã JOIN sẵn category/author/publisher) thành object trả ra API,
// gộp thành các object lồng { id, name } đúng response mẫu trong spec mục 6.5.
// KHÔNG có ảnh ở đây — ảnh (primary_image_url hoặc images) được gắn thêm riêng ở findAll/findById
// vì phải query bảng book_images, để formatBookRow chỉ lo phần dữ liệu thuần của bảng books.
function formatBookRow(row) {
  return {
    id: row.id,
    category_id: row.category_id,
    author_id: row.author_id,
    publisher_id: row.publisher_id,
    title: row.title,
    description: row.description,
    price: row.price,
    stock_quantity: row.stock_quantity,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category: { id: row.category_id, name: row.category_name },
    author: { id: row.author_id, name: row.author_name },
    publisher: { id: row.publisher_id, name: row.publisher_name },
  };
}

// Dựng mệnh đề WHERE dùng chung cho cả query đếm tổng (COUNT) và query lấy dữ liệu (SELECT),
// để 2 query luôn lọc theo đúng cùng 1 điều kiện.
// useLikeFallback: true -> tìm keyword bằng LIKE thay vì FULLTEXT (xem giải thích ở findAll).
function buildWhereClause({ category_id, author_id, publisher_id, includeInactive, keyword, useLikeFallback }) {
  const conditions = [];
  const params = [];

  // Khách thường chỉ thấy sách đang bán; admin (includeInactive = true) thấy được cả sách đã ẩn
  // để có thể tìm và bật lại (mở lại) sách đó.
  if (!includeInactive) {
    conditions.push('b.is_active = 1');
  }

  const categoryIdNum = Number(category_id);
  if (category_id && Number.isInteger(categoryIdNum) && categoryIdNum > 0) {
    conditions.push('b.category_id = ?');
    params.push(categoryIdNum);
  }

  const authorIdNum = Number(author_id);
  if (author_id && Number.isInteger(authorIdNum) && authorIdNum > 0) {
    conditions.push('b.author_id = ?');
    params.push(authorIdNum);
  }

  const publisherIdNum = Number(publisher_id);
  if (publisher_id && Number.isInteger(publisherIdNum) && publisherIdNum > 0) {
    conditions.push('b.publisher_id = ?');
    params.push(publisherIdNum);
  }

  if (keyword && keyword.trim()) {
    if (useLikeFallback) {
      // Fallback mở rộng: tìm cả theo title lẫn tên tác giả (a.name) bằng LIKE
      const likeKeyword = `%${keyword.trim()}%`;
      conditions.push('(b.title LIKE ? OR a.name LIKE ?)');
      params.push(likeKeyword, likeKeyword);
    } else {
      // Schema mới chỉ còn FULLTEXT trên title (author đã tách bảng riêng, mục 4 trong spec:
      // "FULLTEXT chỉ còn trên title vì author giờ ở bảng khác") — tận dụng index ft_title.
      conditions.push('MATCH(b.title) AGAINST(? IN NATURAL LANGUAGE MODE)');
      params.push(keyword.trim());
    }
  }

  const sql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql, params };
}

const JOIN_SQL = `
  JOIN categories c ON b.category_id = c.id
  JOIN authors a ON b.author_id = a.id
  JOIN publishers p ON b.publisher_id = p.id
`;
const SELECT_COLUMNS = `
  b.*, c.name AS category_name, a.name AS author_name, p.name AS publisher_name
`;

// { keyword, category_id, author_id, publisher_id, page, limit, sort, includeInactive } -> { items, total }
async function findAll({
  keyword,
  category_id,
  author_id,
  publisher_id,
  page = 1,
  limit = 12,
  sort = 'newest',
  includeInactive = false,
} = {}) {
  const hasKeyword = !!(keyword && keyword.trim());

  // Bước 1: thử FULLTEXT search trước (chỉ trên title).
  let { sql: whereSql, params } = buildWhereClause({
    category_id,
    author_id,
    publisher_id,
    includeInactive,
    keyword,
    useLikeFallback: false,
  });
  let [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM books b ${JOIN_SQL} ${whereSql}`,
    params
  );
  let total = countRows[0].total;

  // Bước 2: FULLTEXT không ra kết quả nào -> fallback sang LIKE trên title + tên tác giả.
  // Lý do phổ biến nhất: MySQL mặc định bỏ qua từ ngắn hơn ft_min_word_len (mặc định 4 ký tự)
  // và các "stopword" thông dụng, nên tìm từ khóa ngắn bằng FULLTEXT hay ra 0 kết quả dù DB có sách khớp.
  if (hasKeyword && total === 0) {
    ({ sql: whereSql, params } = buildWhereClause({
      category_id,
      author_id,
      publisher_id,
      includeInactive,
      keyword,
      useLikeFallback: true,
    }));
    [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM books b ${JOIN_SQL} ${whereSql}`,
      params
    );
    total = countRows[0].total;
  }

  const orderSql =
    {
      price_asc: 'b.price ASC',
      price_desc: 'b.price DESC',
      newest: 'b.created_at DESC',
    }[sort] || 'b.created_at DESC';

  // Ép kiểu number thủ công cho limit/offset thay vì truyền qua dấu "?": vài phiên bản mysql2
  // xử lý LIMIT ? OFFSET ? qua prepared statement không ổn định (lỗi "Incorrect arguments").
  // Vì đã ép Number() và có fallback mặc định nên không có rủi ro SQL injection ở đây.
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM books b
     ${JOIN_SQL}
     ${whereSql}
     ORDER BY ${orderSql}
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  // Lấy ảnh đại diện cho TẤT CẢ sách trong trang này bằng 1 query duy nhất (thay vì query
  // riêng cho từng sách -> tránh N+1 query), rồi gắn vào từng item dưới field primary_image_url.
  const bookIds = rows.map((row) => row.id);
  const primaryImageMap = await bookImageModel.findPrimaryForBooks(bookIds);
  const items = rows.map((row) => ({
    ...formatBookRow(row),
    primary_image_url: primaryImageMap.get(row.id) || null,
  }));

  return { items, total };
}

// includeInactive: cho phép admin xem cả sách đã ẩn (is_active = 0), khách thường thì không.
async function findById(id, includeInactive = false) {
  const conditions = ['b.id = ?'];
  const params = [id];
  if (!includeInactive) conditions.push('b.is_active = 1');

  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM books b
     ${JOIN_SQL}
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  if (!rows[0]) return undefined;

  // Trang chi tiết cần đầy đủ mảng ảnh (không chỉ ảnh đại diện) để hiển thị gallery.
  const images = await bookImageModel.findByBookId(id);
  return {
    ...formatBookRow(rows[0]),
    images: images.map((img) => ({ id: img.id, image_url: img.image_url, is_primary: !!img.is_primary })),
  };
}

// Tạo sách mới. LƯU Ý: KHÔNG nhận stock_quantity từ tham số — sách mới luôn bắt đầu với
// stock_quantity = 0 (business rule mục 9.3: chỉ tăng qua phiếu nhập hàng, không set trực tiếp
// lúc tạo/sửa sách). category_id/author_id/publisher_id được controller kiểm tra tồn tại trước
// khi gọi hàm này. Ảnh KHÔNG nằm trong hàm này — books không còn cột image_url, ảnh được thêm
// sau qua bookImage.model.js (cần có book_id trước, vì phải upload file riêng).
async function create({ category_id, author_id, publisher_id, title, description, price }) {
  const [result] = await pool.execute(
    `INSERT INTO books (category_id, author_id, publisher_id, title, description, price, stock_quantity)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [category_id, author_id, publisher_id, title, description || null, price]
  );
  return result.insertId;
}

// Cập nhật sách. LƯU Ý: cố tình KHÔNG nhận/khai báo stock_quantity trong tham số — dù object
// data truyền vào có field này (client cố gửi kèm) thì hàm cũng không bao giờ đọc hay đưa nó
// vào câu UPDATE, nên cột stock_quantity trong DB không bao giờ bị đổi bởi hàm này.
async function update(id, { category_id, author_id, publisher_id, title, description, price, is_active }) {
  const [result] = await pool.execute(
    `UPDATE books SET
       category_id = ?, author_id = ?, publisher_id = ?, title = ?, description = ?,
       price = ?, is_active = ?
     WHERE id = ?`,
    [
      category_id,
      author_id,
      publisher_id,
      title,
      description || null,
      price,
      is_active === undefined ? 1 : is_active,
      id,
    ]
  );
  return result.affectedRows > 0;
}

// Soft-delete: chỉ set is_active = 0, KHÔNG xóa hàng khỏi bảng — books đã bán rồi vẫn cần giữ
// lại để order_items/stock_import_items tham chiếu.
async function softDelete(id) {
  const [result] = await pool.execute('UPDATE books SET is_active = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Cộng dồn tồn kho — CHỈ được gọi khi tạo phiếu nhập hàng thành công (business rule mục 9.3:
// stock_quantity chỉ tăng qua nhập hàng, giảm khi đơn hàng "paid", không nguồn nào khác được đổi).
// conn (tùy chọn): connection đang trong transaction của stockImport.controller.js, để nếu 1 trong
// các bước tạo phiếu nhập lỗi giữa chừng thì phần cộng tồn kho này cũng bị rollback theo, không để
// tồn kho tăng "mồ côi" trong khi phiếu nhập lại không được ghi.
async function increaseStock(bookId, quantity, conn = pool) {
  await conn.execute('UPDATE books SET stock_quantity = stock_quantity + ? WHERE id = ?', [quantity, bookId]);
}

// Trừ tồn kho — CHỈ được gọi khi đơn hàng chuyển "paid" (business rule mục 9.3: đây là nguồn GIẢM
// duy nhất của stock_quantity, đối xứng với increaseStock() ở trên là nguồn TĂNG duy nhất).
// conn (tùy chọn): connection đang trong transaction của payment.controller.js (webhook SePay), để
// nếu 1 trong các bước xác nhận thanh toán lỗi giữa chừng thì phần trừ tồn kho này cũng rollback theo.
async function decreaseStock(bookId, quantity, conn = pool) {
  await conn.execute('UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?', [quantity, bookId]);
}

module.exports = { findAll, findById, create, update, softDelete, increaseStock, decreaseStock };
