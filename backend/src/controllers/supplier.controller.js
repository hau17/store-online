const supplierModel = require('../models/supplier.model');
const { success, error } = require('../utils/response');

// GET /api/suppliers?keyword=&page=&limit= — admin only (dữ liệu quản trị nội bộ)
async function getAll(req, res, next) {
  try {
    const { keyword } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { items, total } = await supplierModel.findAll({ keyword, page, limit });
    return success(res, {
      message: 'Lấy danh sách nhà cung cấp thành công',
      data: { items, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/suppliers/:id — admin only
async function getById(req, res, next) {
  try {
    const supplier = await supplierModel.findById(req.params.id);
    if (!supplier) {
      return error(res, { message: 'Không tìm thấy nhà cung cấp', errorCode: 'SUPPLIER_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Lấy nhà cung cấp thành công', data: supplier });
  } catch (err) {
    next(err);
  }
}

function validateSupplierInput({ name }) {
  if (!name || !name.trim()) return 'Tên nhà cung cấp không được để trống';
  return null;
}

// POST /api/suppliers — admin
async function create(req, res, next) {
  try {
    const { name, phone, email, address } = req.body;
    const validationError = validateSupplierInput({ name });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const id = await supplierModel.create({ name, phone, email, address });
    const supplier = await supplierModel.findById(id);
    return success(res, { message: 'Thêm nhà cung cấp thành công', statusCode: 201, data: supplier });
  } catch (err) {
    next(err);
  }
}

// PUT /api/suppliers/:id — admin
async function update(req, res, next) {
  try {
    const { name, phone, email, address } = req.body;
    const validationError = validateSupplierInput({ name });
    if (validationError) {
      return error(res, { message: validationError, errorCode: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const existing = await supplierModel.findById(req.params.id);
    if (!existing) {
      return error(res, { message: 'Không tìm thấy nhà cung cấp', errorCode: 'SUPPLIER_NOT_FOUND', statusCode: 404 });
    }

    await supplierModel.update(req.params.id, { name, phone, email, address });
    const updated = await supplierModel.findById(req.params.id);
    return success(res, { message: 'Cập nhật nhà cung cấp thành công', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/suppliers/:id — admin
async function remove(req, res, next) {
  try {
    const deleted = await supplierModel.remove(req.params.id);
    if (!deleted) {
      return error(res, { message: 'Không tìm thấy nhà cung cấp', errorCode: 'SUPPLIER_NOT_FOUND', statusCode: 404 });
    }
    return success(res, { message: 'Xóa nhà cung cấp thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
