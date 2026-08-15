const cloudinary = require('../config/cloudinary');
const pool = require('../config/db');
const bookModel = require('../models/book.model');
const bookImageModel = require('../models/bookImage.model');
const { success, error } = require('../utils/response');

// Cloudinary SDK gốc dùng kiểu callback (upload_stream(options, callback)), không trả Promise
// sẵn như phần lớn API khác trong app này (mysql2/promise, bcrypt...). Bọc lại bằng "new Promise"
// để có thể dùng await như bình thường, đồng bộ với style code còn lại của dự án.
//
// upload_stream() trả về 1 writable stream — mình "đẩy" buffer ảnh (đã có sẵn trong RAM nhờ
// multer memoryStorage) vào stream đó bằng stream.end(buffer). Khi Cloudinary nhận xong và xử lý
// xong, nó tự gọi callback (err, result) mà mình đã đăng ký lúc tạo stream.
function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'bookstore/books' }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// POST /api/books/:id/images — admin
async function uploadImages(req, res, next) {
  try {
    const bookId = req.params.id;

    // Admin có thể upload ảnh cho cả sách đã ẩn (includeInactive = true), nên không giới hạn is_active
    const book = await bookModel.findById(bookId, true);
    if (!book) {
      return error(res, { message: 'Không tìm thấy sách', errorCode: 'BOOK_NOT_FOUND', statusCode: 404 });
    }

    if (!req.files || req.files.length === 0) {
      return error(res, { message: 'Vui lòng chọn ít nhất 1 ảnh', errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    // Biết trước sách đã có ảnh nào chưa để quyết định ảnh ĐẦU TIÊN trong lần upload này
    // có nên tự động thành ảnh đại diện (is_primary) hay không.
    const existingCount = await bookImageModel.countByBookId(bookId);

    const uploadedImages = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const result = await uploadBufferToCloudinary(file.buffer);

        // Sách chưa có ảnh nào (existingCount === 0) VÀ đây là file đầu tiên của lần upload này
        // -> tự động đặt làm ảnh đại diện, theo đúng logic mục 6.5 bước 4 trong spec.
        const isPrimary = existingCount === 0 && i === 0;

        const imageId = await bookImageModel.create({
          book_id: bookId,
          image_url: result.secure_url,
          cloudinary_public_id: result.public_id,
          is_primary: isPrimary,
          display_order: existingCount + i,
        });

        uploadedImages.push({ id: imageId, image_url: result.secure_url, is_primary: isPrimary });
      } catch (uploadErr) {
        // 1 file lỗi giữa chừng (vd Cloudinary timeout) -> các ảnh đã upload/lưu DB thành công
        // TRƯỚC đó ở vòng lặp này vẫn giữ nguyên, không rollback — chỉ dừng lại và báo rõ ảnh nào lỗi.
        console.error(`Upload ảnh "${file.originalname}" lên Cloudinary thất bại:`, uploadErr);
        return error(res, {
          message: `Tải ảnh "${file.originalname}" thất bại, các ảnh trước đó (nếu có) đã được lưu`,
          errorCode: 'IMAGE_UPLOAD_FAILED',
          statusCode: 502,
        });
      }
    }

    return success(res, {
      message: 'Tải ảnh lên thành công',
      statusCode: 201,
      data: { images: uploadedImages },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/books/:id/images/:imageId — admin
async function deleteImage(req, res, next) {
  try {
    const { id: bookId, imageId } = req.params;

    const image = await bookImageModel.findById(imageId);
    // So sánh String() vì req.params luôn là string còn image.book_id lấy từ DB là number
    if (!image || String(image.book_id) !== String(bookId)) {
      return error(res, { message: 'Không tìm thấy ảnh', errorCode: 'IMAGE_NOT_FOUND', statusCode: 404 });
    }

    // Xóa file thật trên Cloudinary TRƯỚC, đợi xác nhận xong mới xóa row trong DB —
    // để tránh trường hợp xóa DB xong mà lỡ tay để lại ảnh rác trên Cloudinary không ai quản lý.
    await cloudinary.uploader.destroy(image.cloudinary_public_id);
    await bookImageModel.remove(imageId);

    // Ảnh vừa xóa là ảnh đại diện -> tự động gán lại đại diện cho ảnh còn lại đầu tiên (nếu còn ảnh nào)
    if (image.is_primary) {
      const nextImage = await bookImageModel.findFirstRemainingByBookId(bookId);
      if (nextImage) {
        await bookImageModel.setPrimary(nextImage.id);
      }
    }

    return success(res, { message: 'Xóa ảnh thành công' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/books/:id/images/:imageId/primary — admin
async function setPrimaryImage(req, res, next) {
  try {
    const { id: bookId, imageId } = req.params;

    const image = await bookImageModel.findById(imageId);
    if (!image || String(image.book_id) !== String(bookId)) {
      return error(res, { message: 'Không tìm thấy ảnh', errorCode: 'IMAGE_NOT_FOUND', statusCode: 404 });
    }

    // Transaction: bỏ primary của TẤT CẢ ảnh sách này rồi mới gán primary cho đúng 1 ảnh được chọn,
    // để không bao giờ có lúc DB có 0 hoặc 2 ảnh primary cùng lúc cho 1 sách.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await bookImageModel.unsetPrimaryByBookId(bookId, conn);
      await bookImageModel.setPrimary(imageId, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return success(res, { message: 'Đặt ảnh đại diện thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadImages, deleteImage, setPrimaryImage };
