const express = require('express');
const router = express.Router();
const stockImportController = require('../controllers/stockImport.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Toàn bộ route stock-imports chỉ dành cho admin (mục 6.10 trong spec).
// CHỈ có 3 route GET list / GET detail / POST create — KHÔNG có PUT/DELETE: phiếu nhập không cho
// sửa/xóa để tránh phải xử lý rollback tồn kho phức tạp (nhập sai thì tạo phiếu mới để điều chỉnh).
router.use(authMiddleware, adminMiddleware);

router.get('/', stockImportController.getStockImports);
router.get('/:id', stockImportController.getStockImportById);
router.post('/', stockImportController.createStockImport);

module.exports = router;
