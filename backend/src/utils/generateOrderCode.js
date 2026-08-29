// Sinh order_code duy nhất, format: DH + YYYYMMDD + số thứ tự 3 chữ số (vd DH20260815001).
// Logic giống hệt generateImportCode.js (xem file đó để có giải thích đầy đủ về race condition):
// đếm số đơn ĐÃ TẠO hôm nay bằng connection đang trong transaction của nơi gọi (order.controller.js),
// rồi +1 — để câu SELECT COUNT và câu INSERT orders ngay sau đó cùng nằm chung 1 transaction.
async function generateOrderCode(conn) {
  const [rows] = await conn.execute(
    'SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE()'
  );
  const sequence = rows[0].count + 1;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');

  return `DH${yyyy}${mm}${dd}${seq}`;
}

module.exports = generateOrderCode;
