// Build URL ảnh QR theo chuẩn VietQR: https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NUMBER}-{TEMPLATE}.png?...
// QR nhúng sẵn số tiền + nội dung chuyển khoản -> khách chỉ cần quét bằng app ngân hàng, không phải
// gõ tay (giảm sai sót nhập liệu).
//
// LƯU Ý (mục 6.8 trong spec): QR chỉ hỗ trợ UX, KHÔNG PHẢI cơ chế bảo mật — một số app ngân hàng vẫn
// cho khách sửa lại nội dung/số tiền trước khi xác nhận chuyển. Vì vậy payment.controller.js vẫn
// PHẢI so khớp content/transferAmount thật ở webhook, không được coi QR đã "khóa cứng" giao dịch.
const env = require("../config/env");

// amount, addInfo (= order_code) đều phải encodeURIComponent trước khi ghép URL — accountName đặc
// biệt cần vì luôn có khoảng trắng (vd "NGUYEN VAN A" -> "NGUYEN%20VAN%20A").
function generateVietQrUrl({ amount, addInfo }) {
  const {
    VIETQR_BANK_BIN,
    VIETQR_ACCOUNT_NUMBER,
    VIETQR_ACCOUNT_NAME,
    VIETQR_TEMPLATE,
  } = env;
  const base = `https://img.vietqr.io/image/${VIETQR_BANK_BIN}-${VIETQR_ACCOUNT_NUMBER}-${VIETQR_TEMPLATE}.png`;
  const query =
    `amount=${encodeURIComponent(amount)}` +
    `&addInfo=${encodeURIComponent(addInfo)}` +
    `&accountName=${encodeURIComponent(VIETQR_ACCOUNT_NAME)}`;
  return `${base}?${query}`;
}

module.exports = generateVietQrUrl;
