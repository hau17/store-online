// Đọc biến môi trường từ file .env và export ra 1 object duy nhất
// để các file khác import và dùng, thay vì gọi process.env rải rác khắp nơi.
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  SEPAY_API_TOKEN: process.env.SEPAY_API_TOKEN,
  SEPAY_WEBHOOK_SECRET: process.env.SEPAY_WEBHOOK_SECRET,
  SEPAY_ACCOUNT_NUMBER: process.env.SEPAY_ACCOUNT_NUMBER,
  SEPAY_BANK_CODE: process.env.SEPAY_BANK_CODE,

  // VietQR: tạo QR chuyển khoản fix cứng số tiền + nội dung (mục 6.7)
  VIETQR_BANK_BIN: process.env.VIETQR_BANK_BIN,
  VIETQR_ACCOUNT_NUMBER: process.env.VIETQR_ACCOUNT_NUMBER,
  VIETQR_ACCOUNT_NAME: process.env.VIETQR_ACCOUNT_NAME,
  VIETQR_TEMPLATE: process.env.VIETQR_TEMPLATE || 'compact2',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
