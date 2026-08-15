const bookModel = require('../models/book.model');
const categoryModel = require('../models/category.model');
const authorModel = require('../models/author.model');
const publisherModel = require('../models/publisher.model');
const { success, error } = require('../utils/response');

// GET /api/books — public (optionalAuthMiddleware gắn req.user nếu có token admin hợp lệ)
async function getAll(req, res, next) {
  try {
    const { keyword, category_id, author_id, publisher_id } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const sort = req.query.sort || 'newest';
    const includeInactive = req.user?.role === 'admin';

    const { items, total } = await bookModel.findAll({
      keyword,
      category_id,
      author_id,
      publisher_id,
      page,
      limit,
      sort,
      includeInactive,
    });

    return success(res, {
      message: 'Lấy danh sách sách thành công',
      data: {
        items,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/books/:id — public
async function getById(req, res, next) {
  try {
    const includeInactive = req.user?.role === 'admin';
    const book = await bookModel.findById(req.params.id, includeInactive);
    if (!book) {
      return error(res, { message: 'Không tìm thấy sách', errorCode: 'BOOK_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Lấy chi tiết sách thành công', data: book });
  } catch (err) {
    next(err);
  }
}

// Validate input cơ bản dùng chung cho create/update. Trả về message lỗi đầu tiên gặp phải, hoặc null nếu hợp lệ.
function validateBookInput({ title, price }) {
  if (!title || !title.trim()) return 'Tên sách không được để trống';

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) return 'Giá sách phải lớn hơn 0';

  return null;
}

// Kiểm tra category_id/author_id/publisher_id đều phải trỏ tới bản ghi có thật trước khi insert/update.
// Trả về { errorCode, message } của lỗi ĐẦU TIÊN gặp phải, hoặc null nếu cả 3 đều hợp lệ.
async function validateForeignKeys({ category_id, author_id, publisher_id }) {
  const category = await categoryModel.findById(category_id);
  if (!category) return { errorCode: 'CATEGORY_NOT_FOUND', message: 'category_id không tồn tại' };

  const author = await authorModel.findById(author_id);
  if (!author) return { errorCode: 'AUTHOR_NOT_FOUND', message: 'author_id không tồn tại' };

  const publisher = await publisherModel.findById(publisher_id);
  if (!publisher) return { errorCode: 'PUBLISHER_NOT_FOUND', message: 'publisher_id không tồn tại' };

  return null;
}

// Nếu client lỡ gửi kèm stock_quantity trong body, chỉ log cảnh báo ở server để biết,
// KHÔNG trả lỗi cho client (field này bị bookModel.create/update lờ đi hoàn toàn — business rule mục 9.3).
function warnIfStockQuantitySent(req) {
  if (req.body.stock_quantity !== undefined) {
    console.warn(
      `[book.controller] Bỏ qua field "stock_quantity" client gửi kèm ở ${req.method} ${req.originalUrl} ` +
        '— stock_quantity chỉ được đổi qua phiếu nhập hàng hoặc khi đơn hàng chuyển paid.'
    );
  }
}

// POST /api/books — admin
async function create(req, res, next) {
  try {
    warnIfStockQuantitySent(req);

    const validationError = validateBookInput(req.body);
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const fkError = await validateForeignKeys(req.body);
    if (fkError) {
      return error(res, { message: fkError.message, errorCode: fkError.errorCode, statusCode: 400 });
    }

    const id = await bookModel.create(req.body);
    const book = await bookModel.findById(id, true);
    return success(res, { message: 'Thêm sách thành công', statusCode: 201, data: book });
  } catch (err) {
    next(err);
  }
}

// PUT /api/books/:id — admin
async function update(req, res, next) {
  try {
    warnIfStockQuantitySent(req);

    const validationError = validateBookInput(req.body);
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const existingBook = await bookModel.findById(req.params.id, true);
    if (!existingBook) {
      return error(res, { message: 'Không tìm thấy sách', errorCode: 'BOOK_NOT_FOUND', statusCode: 404 });
    }

    const fkError = await validateForeignKeys(req.body);
    if (fkError) {
      return error(res, { message: fkError.message, errorCode: fkError.errorCode, statusCode: 400 });
    }

    await bookModel.update(req.params.id, req.body);
    const updated = await bookModel.findById(req.params.id, true);
    return success(res, { message: 'Cập nhật sách thành công', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/books/:id — admin. Soft-delete: chỉ ẩn (is_active = 0), không xóa thật.
async function remove(req, res, next) {
  try {
    const deleted = await bookModel.softDelete(req.params.id);
    if (!deleted) {
      return error(res, { message: 'Không tìm thấy sách', errorCode: 'BOOK_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Đã ẩn sách khỏi cửa hàng' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
