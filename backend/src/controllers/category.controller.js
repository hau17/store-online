const categoryModel = require("../models/category.model");
const { success, error } = require("../utils/response");

// GET /api/categories?keyword=&page=&limit= — public
async function getAll(req, res, next) {
  try {
    const { keyword } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { items, total } = await categoryModel.findAll({ keyword, page, limit });
    return success(res, {
      message: "Lấy danh sách danh mục thành công",
      data: { items, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/categories/:id — public
async function getById(req, res, next) {
  try {
    const category = await categoryModel.findById(req.params.id);
    if (!category) {
      return error(res, {
        message: "Không tìm thấy danh mục",
        errorCode: "CATEGORY_NOT_FOUND",
        statusCode: 404,
      });
    }
    return success(res, { message: "Lấy danh mục thành công", data: category });
  } catch (err) {
    next(err);
  }
}

function validateCategoryInput({ name, slug }) {
  if (!name || !name.trim()) return "Tên danh mục không được để trống";
  if (!slug || !slug.trim()) return "Slug không được để trống";
  return null;
}

// POST /api/categories — admin
async function create(req, res, next) {
  try {
    const { name, slug, description } = req.body;
    const validationError = validateCategoryInput({ name, slug });
    if (validationError) {
      return error(res, {
        message: validationError,
        errorCode: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const existing = await categoryModel.findBySlug(slug);
    if (existing) {
      return error(res, {
        message: "Slug đã tồn tại, vui lòng chọn slug khác",
        errorCode: "SLUG_EXISTS",
        statusCode: 409,
      });
    }

    const id = await categoryModel.create({ name, slug, description });
    const category = await categoryModel.findById(id);
    return success(res, {
      message: "Tạo danh mục thành công",
      statusCode: 201,
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/categories/:id — admin
async function update(req, res, next) {
  try {
    const { name, slug, description } = req.body;
    const validationError = validateCategoryInput({ name, slug });
    if (validationError) {
      return error(res, {
        message: validationError,
        errorCode: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const existingCategory = await categoryModel.findById(req.params.id);
    if (!existingCategory) {
      return error(res, {
        message: "Không tìm thấy danh mục",
        errorCode: "CATEGORY_NOT_FOUND",
        statusCode: 404,
      });
    }

    // Nếu đổi sang 1 slug khác thì phải kiểm tra slug mới có bị trùng với category KHÁC không
    const slugOwner = await categoryModel.findBySlug(slug);
    if (slugOwner && slugOwner.id !== existingCategory.id) {
      return error(res, {
        message: "Slug đã tồn tại, vui lòng chọn slug khác",
        errorCode: "SLUG_EXISTS",
        statusCode: 409,
      });
    }

    await categoryModel.update(req.params.id, { name, slug, description });
    const updated = await categoryModel.findById(req.params.id);
    return success(res, {
      message: "Cập nhật danh mục thành công",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/categories/:id — admin
async function remove(req, res, next) {
  try {
    // categoryModel.remove tự ném lỗi 409 CATEGORY_HAS_BOOKS nếu còn sách thuộc danh mục này,
    // lỗi đó sẽ rơi xuống catch bên dưới rồi next(err) cho error.middleware xử lý.
    const deleted = await categoryModel.remove(req.params.id);
    if (!deleted) {
      return error(res, {
        message: "Không tìm thấy danh mục",
        errorCode: "CATEGORY_NOT_FOUND",
        statusCode: 404,
      });
    }
    return success(res, { message: "Xóa danh mục thành công" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
