const pool = require('../config/db');
const stockImportModel = require('../models/stockImport.model');
const stockImportItemModel = require('../models/stockImportItem.model');
const supplierModel = require('../models/supplier.model');
const bookModel = require('../models/book.model');
const generateImportCode = require('../utils/generateImportCode');
const { success, error } = require('../utils/response');

// Validate TRƯỚC khi mở transaction (đọc dữ liệu thuần, không cần transaction) — kiểm tra supplier
// tồn tại, items không rỗng, từng book_id tồn tại, quantity nguyên dương, import_price >= 0.
// Trả về { errorCode, message } của lỗi ĐẦU TIÊN gặp phải, hoặc null nếu toàn bộ hợp lệ.
async function validateStockImportInput({ supplier_id, items }) {
  if (!supplier_id) {
    return { errorCode: 'VALIDATION_ERROR', message: 'Vui lòng chọn nhà cung cấp' };
  }
  const supplier = await supplierModel.findById(supplier_id);
  if (!supplier) {
    return { errorCode: 'SUPPLIER_NOT_FOUND', message: 'Nhà cung cấp không tồn tại' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { errorCode: 'VALIDATION_ERROR', message: 'Phiếu nhập phải có ít nhất 1 sách' };
  }

  for (const item of items) {
    if (!item || !item.book_id) {
      return { errorCode: 'VALIDATION_ERROR', message: 'Mỗi dòng sách phải có book_id' };
    }

    // includeInactive = true: admin vẫn được nhập thêm hàng cho sách đang ẩn (is_active = 0)
    const book = await bookModel.findById(item.book_id, true);
    if (!book) {
      return { errorCode: 'BOOK_NOT_FOUND', message: `Sách với id ${item.book_id} không tồn tại` };
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        errorCode: 'VALIDATION_ERROR',
        message: `Số lượng sách "${book.title}" phải là số nguyên lớn hơn 0`,
      };
    }

    const importPrice = Number(item.import_price);
    if (!Number.isFinite(importPrice) || importPrice < 0) {
      return { errorCode: 'VALIDATION_ERROR', message: `Giá nhập sách "${book.title}" không hợp lệ` };
    }
  }

  return null;
}

// POST /api/stock-imports — admin
async function createStockImport(req, res, next) {
  try {
    const { supplier_id, items, note } = req.body;

    const validationError = await validateStockImportInput({ supplier_id, items });
    if (validationError) {
      return error(res, {
        message: validationError.message,
        errorCode: validationError.errorCode,
        statusCode: 400,
      });
    }

    // Chuẩn hóa lại kiểu số (client có thể gửi "5" dạng string) để dùng thống nhất cho các bước dưới.
    const normalizedItems = items.map((item) => ({
      book_id: item.book_id,
      quantity: Number(item.quantity),
      import_price: Number(item.import_price),
    }));

    // Toàn bộ các bước a-e dưới đây PHẢI cùng thành công hoặc cùng thất bại (business rule mục 9.4):
    // nếu ghi phiếu nhập xong mà lỡ lỗi giữa chừng lúc cộng tồn kho (hoặc ngược lại), số liệu tồn kho
    // sẽ lệch khỏi thực tế mãi mãi vì không có cách nào tự phát hiện lại sau này. Transaction đảm bảo
    // hoặc ghi đủ cả phiếu nhập + chi tiết + tồn kho, hoặc không ghi gì cả (rollback sạch).
    const conn = await pool.getConnection();
    let importId;
    try {
      await conn.beginTransaction();

      // a. Sinh import_code duy nhất (xem giải thích race condition trong generateImportCode.js)
      const importCode = await generateImportCode(conn);

      // b. Tính total_amount = tổng (quantity × import_price) toàn bộ items
      const totalAmount = normalizedItems.reduce(
        (sum, item) => sum + item.quantity * item.import_price,
        0
      );

      // c. Insert header phiếu nhập
      importId = await stockImportModel.create(
        {
          import_code: importCode,
          supplier_id,
          created_by: req.user.id,
          total_amount: totalAmount,
          note,
        },
        conn
      );

      // d. Insert toàn bộ chi tiết (bulk insert 1 câu query)
      await stockImportItemModel.createMany(importId, normalizedItems, conn);

      // e. Cộng dồn tồn kho cho từng sách — nguồn TĂNG duy nhất của stock_quantity
      for (const item of normalizedItems) {
        await bookModel.increaseStock(item.book_id, item.quantity, conn);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Query lại SAU KHI commit để trả về đầy đủ thông tin (tên nhà cung cấp, tên sách từng dòng)
    // đúng response mẫu trong spec mục 6.10.
    const stockImport = await stockImportModel.findById(importId);
    const importItems = await stockImportItemModel.findByStockImportId(importId);

    return success(res, {
      message: 'Tạo phiếu nhập hàng thành công',
      statusCode: 201,
      data: {
        import_id: stockImport.id,
        import_code: stockImport.import_code,
        supplier: stockImport.supplier,
        total_amount: stockImport.total_amount,
        items: importItems.map((item) => ({
          book_id: item.book_id,
          title: item.book_title,
          quantity: item.quantity,
          import_price: item.import_price,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stock-imports — admin
async function getStockImports(req, res, next) {
  try {
    const { supplier_id, from_date, to_date } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { items, total } = await stockImportModel.findAll({
      supplier_id,
      from_date,
      to_date,
      page,
      limit,
    });

    return success(res, {
      message: 'Lấy danh sách phiếu nhập hàng thành công',
      data: {
        items,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stock-imports/:id — admin
async function getStockImportById(req, res, next) {
  try {
    const stockImport = await stockImportModel.findById(req.params.id);
    if (!stockImport) {
      return error(res, {
        message: 'Không tìm thấy phiếu nhập hàng',
        errorCode: 'STOCK_IMPORT_NOT_FOUND',
        statusCode: 404,
      });
    }

    const items = await stockImportItemModel.findByStockImportId(req.params.id);

    return success(res, {
      message: 'Lấy chi tiết phiếu nhập hàng thành công',
      data: {
        ...stockImport,
        items: items.map((item) => ({
          book_id: item.book_id,
          title: item.book_title,
          quantity: item.quantity,
          import_price: item.import_price,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createStockImport, getStockImports, getStockImportById };
