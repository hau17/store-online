// Đọc header Authorization: Bearer <token> -> verify JWT -> gắn req.user = { id, role }
// Mọi route cần đăng nhập sẽ dùng middleware này trước khi vào controller.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../utils/response');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // dạng "Bearer eyJhbGci..."

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, {
      message: 'Thiếu token xác thực',
      errorCode: 'NO_TOKEN',
      statusCode: 401,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify tự kiểm tra luôn hạn dùng (exp) đã ký lúc login,
    // hết hạn hoặc sai JWT_SECRET đều rơi vào catch bên dưới.
    const payload = jwt.verify(token, env.JWT_SECRET); // payload = { id, role, iat, exp }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return error(res, {
      message: 'Token không hợp lệ hoặc đã hết hạn',
      errorCode: 'INVALID_TOKEN',
      statusCode: 401,
    });
  }
}

module.exports = authMiddleware;
