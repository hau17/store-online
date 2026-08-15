// Sinh order_code theo format: DH + YYYYMMDD + số thứ tự 3 chữ số, vd DH20260814001
// (xem mục 6.5 bước 4 trong spec). Hàm này chỉ lo phần format chuỗi;
// việc lấy "số thứ tự tiếp theo trong ngày" từ DB sẽ làm ở bước code logic checkout sau.
function generateOrderCode(date, sequence) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `DH${yyyy}${mm}${dd}${seq}`;
}

module.exports = generateOrderCode;
