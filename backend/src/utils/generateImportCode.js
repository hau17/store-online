// Sinh import_code duy nhất, format: PN + YYYYMMDD + số thứ tự 3 chữ số (vd PN20260815001).
// Số thứ tự = số phiếu nhập ĐÃ TẠO trong ngày hôm nay (đếm theo created_at) + 1.
//
// Nhận vào "conn" là connection ĐANG NẰM TRONG transaction của nơi gọi (stockImport.controller.js),
// không dùng pool trực tiếp — để câu SELECT COUNT đếm số thứ tự và câu INSERT stock_imports ngay
// sau đó cùng nằm chung 1 transaction. Đây là mức xử lý race condition TỐI THIỂU: không chống được
// tuyệt đối 2 request tạo phiếu nhập CÙNG LÚC trong cùng 1 ngày (cả 2 có thể đếm ra cùng 1 số thứ tự
// trước khi request kia kịp insert), nhưng cột import_code có UNIQUE KEY nên nếu trùng thì request
// thứ 2 sẽ bị lỗi insert (duplicate key) và tự rollback toàn bộ transaction — KHÔNG tạo ra dữ liệu
// sai, chỉ là phải thử lại. Chấp nhận được vì hệ thống chỉ có 1 admin thao tác, xác suất trùng rất thấp.
async function generateImportCode(conn) {
  const [rows] = await conn.execute(
    'SELECT COUNT(*) AS count FROM stock_imports WHERE DATE(created_at) = CURDATE()'
  );
  const sequence = rows[0].count + 1;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');

  return `PN${yyyy}${mm}${dd}${seq}`;
}

module.exports = generateImportCode;
