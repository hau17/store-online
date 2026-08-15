// Khởi tạo Cloudinary SDK 1 lần duy nhất bằng thông tin tài khoản trong .env,
// các nơi khác (bookImage.controller.js) chỉ cần require file này để dùng chung 1 instance đã config.
const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
