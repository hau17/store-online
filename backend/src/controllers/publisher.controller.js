const publisherModel = require('../models/publisher.model');
const { success, error } = require('../utils/response');

// GET /api/publishers?keyword=&page=&limit= — public
async function getAll(req, res, next) {
  try {
    const { keyword } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { items, total } = await publisherModel.findAll({ keyword, page, limit });
    return success(res, {
      message: 'Lấy danh sách nhà xuất bản thành công',
      data: { items, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/publishers/:id — public
async function getById(req, res, next) {
  try {
    const publisher = await publisherModel.findById(req.params.id);
    if (!publisher) {
      return error(res, { message: 'Không tìm thấy nhà xuất bản', errorCode: 'PUBLISHER_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Lấy nhà xuất bản thành công', data: publisher });
  } catch (err) {
    next(err);
  }
}

function validatePublisherInput({ name }) {
  if (!name || !name.trim()) return 'Tên nhà xuất bản không được để trống';
  return null;
}

// POST /api/publishers — admin
async function create(req, res, next) {
  try {
    const { name, address } = req.body;
    const validationError = validatePublisherInput({ name });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const id = await publisherModel.create({ name, address });
    const publisher = await publisherModel.findById(id);
    return success(res, { message: 'Thêm nhà xuất bản thành công', statusCode: 201, data: publisher });
  } catch (err) {
    next(err);
  }
}

// PUT /api/publishers/:id — admin
async function update(req, res, next) {
  try {
    const { name, address } = req.body;
    const validationError = validatePublisherInput({ name });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const existing = await publisherModel.findById(req.params.id);
    if (!existing) {
      return error(res, { message: 'Không tìm thấy nhà xuất bản', errorCode: 'PUBLISHER_NOT_FOUND', statusCode: 404 });
    }

    await publisherModel.update(req.params.id, { name, address });
    const updated = await publisherModel.findById(req.params.id);
    return success(res, { message: 'Cập nhật nhà xuất bản thành công', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/publishers/:id — admin
async function remove(req, res, next) {
  try {
    const deleted = await publisherModel.remove(req.params.id);
    if (!deleted) {
      return error(res, { message: 'Không tìm thấy nhà xuất bản', errorCode: 'PUBLISHER_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Xóa nhà xuất bản thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
