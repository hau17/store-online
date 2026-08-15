// Controller xử lý 3 API của mục 6.1: register, login, me.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const { success, error } = require('../utils/response');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10; // số vòng "muối" khi hash, càng cao càng chậm nhưng càng khó brute-force

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { full_name, email, password, phone } = req.body;

    // 1. Validate input cơ bản phía server (không tin tưởng dữ liệu từ client)
    if (!full_name || !full_name.trim()) {
      return error(res, {
        message: 'Họ tên không được để trống',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return error(res, {
        message: 'Email không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }
    if (!password || password.length < 6) {
      return error(res, {
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    // 2. Kiểm tra email đã tồn tại chưa
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return error(res, {
        message: 'Email đã tồn tại',
        errorCode: 'EMAIL_EXISTS',
        statusCode: 409,
      });
    }

    // 3. Hash password bằng bcrypt trước khi lưu DB — KHÔNG BAO GIỜ lưu password dạng plain text.
    // bcrypt.hash tự sinh salt ngẫu nhiên rồi trộn vào password SALT_ROUNDS lần trước khi băm,
    // nên 2 user cùng password vẫn ra 2 chuỗi hash khác nhau.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Insert user mới (role mặc định 'customer' trong createUser)
    const userId = await userModel.createUser({ full_name, email, password: hashedPassword, phone });

    // 5. Trả response đúng format mục 6.1 — không trả password
    return success(res, {
      message: 'Đăng ký thành công',
      statusCode: 201,
      data: { id: userId, full_name, email },
    });
  } catch (err) {
    next(err); // lỗi không lường trước (vd mất kết nối DB) -> để error.middleware xử lý
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, {
        message: 'Vui lòng nhập email và mật khẩu',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    // 1. Tìm user theo email — hàm findByEmail trả về đủ cột kể cả password (đã hash)
    const user = await userModel.findByEmail(email);
    if (!user) {
      // Cố tình dùng chung message/error_code với case sai password,
      // để không lộ thông tin "email này có tồn tại trong hệ thống hay không".
      return error(res, {
        message: 'Email hoặc mật khẩu không đúng',
        errorCode: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    }

    // 2. So sánh password người dùng nhập với hash lưu trong DB.
    // bcrypt.compare tự lấy lại salt đã lưu trong chuỗi hash để băm lại password vừa nhập rồi so khớp.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return error(res, {
        message: 'Email hoặc mật khẩu không đúng',
        errorCode: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    }

    // 3. Tài khoản bị khóa (is_active = 0) thì không cho đăng nhập
    if (!user.is_active) {
      return error(res, {
        message: 'Tài khoản đã bị khóa',
        errorCode: 'ACCOUNT_DISABLED',
        statusCode: 403,
      });
    }

    // 4. Ký JWT: payload chỉ chứa id + role (đủ để các middleware sau xác thực/phân quyền),
    // KHÔNG nhét password hay thông tin nhạy cảm vào payload vì JWT chỉ được mã hóa base64,
    // ai cũng decode đọc được nội dung (chỉ không sửa được vì có chữ ký).
    const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    return success(res, {
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: { id: user.id, full_name: user.full_name, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me — yêu cầu đã qua auth.middleware nên req.user đã có sẵn { id, role }
async function getMe(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id); // hàm này đã tự loại cột password
    if (!user) {
      return error(res, {
        message: 'Không tìm thấy người dùng',
        errorCode: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    }
    return success(res, { message: 'Lấy thông tin thành công', data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };
