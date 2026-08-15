// Tạo 1 connection pool duy nhất bằng mysql2/promise.
// Pool = 1 nhóm connection tái sử dụng, tránh phải mở/đóng connection mới cho mỗi query.
// Tất cả các file trong models/ sẽ require file này để lấy pool dùng chung.
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10, // số connection tối đa trong pool
  queueLimit: 0,
});

module.exports = pool;
