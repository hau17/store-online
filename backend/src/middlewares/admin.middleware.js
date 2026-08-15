// Chạy SAU auth.middleware (cần req.user đã được gắn sẵn) -> kiểm tra role admin.
const { error } = require('../utils/response');

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return error(res, {
      message: 'Bạn không có quyền thực hiện thao tác này',
      errorCode: 'FORBIDDEN',
      statusCode: 403,
    });
  }
  next();
}

module.exports = adminMiddleware;
