// Chạy SAU auth.middleware -> chỉ cho role customer đi tiếp (giỏ hàng, tạo đơn — spec mục 6.6).
const { error } = require('../utils/response');

function customerMiddleware(req, res, next) {
  if (req.user?.role !== 'customer') {
    return error(res, {
      message: 'Chức năng này chỉ dành cho khách hàng',
      errorCode: 'CUSTOMER_ONLY',
      statusCode: 403,
    });
  }
  next();
}

module.exports = customerMiddleware;
