// Helper để trả response theo đúng format chuẩn ở mục 5 trong spec,
// tránh phải gõ lại { success, message, data } thủ công ở mỗi controller.

function success(res, { message = "OK", data = {}, statusCode = 200 } = {}) {
  return res.status(statusCode).json({ success: true, message, data });
}

function error(
  res,
  { message = "Có lỗi xảy ra", errorCode = "ERROR", statusCode = 500 } = {},
) {
  return res
    .status(statusCode)
    .json({ success: false, message, error_code: errorCode });
}

module.exports = { success, error };
