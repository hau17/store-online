// Admin quản lý tài khoản khách hàng (mục 6.11) — xem/khóa/mở khóa. Việc tự xem/sửa hồ sơ của
// chính người dùng nằm ở auth.controller.js (mục 6.1), không lặp lại ở đây.
const userModel = require('../models/user.model');
const { success, error } = require('../utils/response');

// GET /api/users?keyword=&status=&page=&limit= — admin
async function getCustomers(req, res, next) {
  try {
    const { keyword, status } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { items, total } = await userModel.findAllCustomers({ keyword, status, page, limit });

    return success(res, {
      message: 'Lấy danh sách khách hàng thành công',
      data: { items, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id — admin
async function getCustomerById(req, res, next) {
  try {
    const customer = await userModel.findCustomerById(req.params.id);
    if (!customer) {
      return error(res, {
        message: 'Không tìm thấy khách hàng',
        errorCode: 'CUSTOMER_NOT_FOUND',
        statusCode: 404,
      });
    }
    return success(res, { message: 'Lấy thông tin khách hàng thành công', data: customer });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/:id/lock — admin. reason (optional): chỉ dùng để log lại lý do, DB chưa có cột
// riêng lưu lý do khóa nên không bắt buộc phải lưu — log console là đủ theo yêu cầu.
async function lockCustomer(req, res, next) {
  try {
    const role = await userModel.findRoleById(req.params.id);
    if (!role) {
      return error(res, {
        message: 'Không tìm thấy người dùng',
        errorCode: 'CUSTOMER_NOT_FOUND',
        statusCode: 404,
      });
    }
    // Không cho khóa tài khoản admin (kể cả chính mình) qua endpoint này — business rule #10
    if (role === 'admin') {
      return error(res, {
        message: 'Không thể khóa tài khoản admin',
        errorCode: 'CANNOT_LOCK_ADMIN',
        statusCode: 400,
      });
    }

    if (req.body?.reason) {
      console.log(`[Khóa tài khoản] user_id=${req.params.id}, lý do: ${req.body.reason}`);
    }

    await userModel.lockUser(req.params.id);
    return success(res, { message: 'Khóa tài khoản thành công' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/:id/unlock — admin
async function unlockCustomer(req, res, next) {
  try {
    const unlocked = await userModel.unlockUser(req.params.id);
    if (!unlocked) {
      return error(res, {
        message: 'Không tìm thấy người dùng',
        errorCode: 'CUSTOMER_NOT_FOUND',
        statusCode: 404,
      });
    }
    return success(res, { message: 'Mở khóa tài khoản thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCustomers, getCustomerById, lockCustomer, unlockCustomer };
