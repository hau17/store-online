// Cấu hình multer để nhận file ảnh từ client trước khi đẩy lên Cloudinary.
// Dùng memoryStorage: file được giữ tạm trong RAM dưới dạng Buffer (req.files[i].buffer),
// KHÔNG ghi ra ổ đĩa server — đúng yêu cầu "không lưu file trực tiếp trên ổ đĩa"
// (business rule mục 9.9), vì ảnh sẽ được upload thẳng lên Cloudinary từ buffer đó.
const multer = require('multer');
const { error } = require('../utils/response');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB/ảnh
const MAX_FILES = 5; // tối đa 5 ảnh/lần upload

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Gọi cb với lỗi -> multer dừng lại, lỗi này sẽ được bắt ở wrapper bên dưới
    return cb(new Error('Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP'));
  }
  cb(null, true);
}

const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter,
}).array('images', MAX_FILES);

// Bọc middleware multer lại để tự bắt lỗi (sai định dạng, quá dung lượng, quá số lượng file)
// và trả về đúng format response chuẩn của app (400 + message rõ ràng) thay vì để lọt xuống
// error.middleware chung chung (multer ném lỗi qua callback thay vì throw nên phải tự next()).
function uploadImagesMiddleware(req, res, next) {
  uploadImages(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, {
          message: 'Mỗi ảnh không được vượt quá 5MB',
          errorCode: 'FILE_TOO_LARGE',
          statusCode: 400,
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, {
          message: 'Chỉ được tải lên tối đa 5 ảnh 1 lần',
          errorCode: 'TOO_MANY_FILES',
          statusCode: 400,
        });
      }
    }

    // Lỗi từ fileFilter (sai định dạng) hoặc lỗi multer khác chưa liệt kê riêng ở trên
    return error(res, {
      message: err.message || 'Tải ảnh lên thất bại',
      errorCode: 'INVALID_FILE',
      statusCode: 400,
    });
  });
}

module.exports = uploadImagesMiddleware;
