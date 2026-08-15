const authorModel = require('../models/author.model');
const { success, error } = require('../utils/response');

// GET /api/authors?keyword=... — public
async function getAll(req, res, next) {
  try {
    const items = await authorModel.findAll({ keyword: req.query.keyword });
    return success(res, { message: 'Lấy danh sách tác giả thành công', data: { items } });
  } catch (err) {
    next(err);
  }
}

// GET /api/authors/:id — public
async function getById(req, res, next) {
  try {
    const author = await authorModel.findById(req.params.id);
    if (!author) {
      return error(res, { message: 'Không tìm thấy tác giả', errorCode: 'AUTHOR_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Lấy tác giả thành công', data: author });
  } catch (err) {
    next(err);
  }
}

function validateAuthorInput({ name }) {
  if (!name || !name.trim()) return 'Tên tác giả không được để trống';
  return null;
}

// POST /api/authors — admin
async function create(req, res, next) {
  try {
    const { name, bio } = req.body;
    const validationError = validateAuthorInput({ name });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const id = await authorModel.create({ name, bio });
    const author = await authorModel.findById(id);
    return success(res, { message: 'Thêm tác giả thành công', statusCode: 201, data: author });
  } catch (err) {
    next(err);
  }
}

// PUT /api/authors/:id — admin
async function update(req, res, next) {
  try {
    const { name, bio } = req.body;
    const validationError = validateAuthorInput({ name });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const existing = await authorModel.findById(req.params.id);
    if (!existing) {
      return error(res, { message: 'Không tìm thấy tác giả', errorCode: 'AUTHOR_NOT_FOUND', statusCode: 404 });
    }

    await authorModel.update(req.params.id, { name, bio });
    const updated = await authorModel.findById(req.params.id);
    return success(res, { message: 'Cập nhật tác giả thành công', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/authors/:id — admin
async function remove(req, res, next) {
  try {
    // authorModel.remove tự ném lỗi 409 AUTHOR_HAS_BOOKS nếu còn sách tham chiếu, next(err) xử lý tiếp
    const deleted = await authorModel.remove(req.params.id);
    if (!deleted) {
      return error(res, { message: 'Không tìm thấy tác giả', errorCode: 'AUTHOR_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Xóa tác giả thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
