// Middleware xử lý lỗi tập trung. Express nhận diện đây là error handler nhờ có 4 tham số
// (err, req, res, next). Mọi lỗi throw/next(err) trong controller sẽ rơi xuống đây.
const { error } = require('../utils/response');

function errorMiddleware(err, req, res, next) {
  console.error(err); // log đầy đủ stack trace ra console để debug, không lộ ra response

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Lỗi hệ thống';
  const errorCode = err.errorCode || 'INTERNAL_ERROR';

  return error(res, { message, errorCode, statusCode });
}

module.exports = errorMiddleware;
