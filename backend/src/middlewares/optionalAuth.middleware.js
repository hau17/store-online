// Middleware "mềm" cho các route PUBLIC nhưng muốn biết thêm "người gọi có phải admin không"
// để trả nhiều dữ liệu hơn (vd cho xem cả sách đã ẩn). Khác auth.middleware ở chỗ:
// không có token / token sai -> vẫn next() bình thường, KHÔNG trả 401, vì route vẫn phải công khai.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role };
    } catch (err) {
      // Token hết hạn/sai -> coi như khách vãng lai, lờ đi chứ không chặn request
    }
  }

  next();
}

module.exports = optionalAuthMiddleware;
