const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Toàn bộ route suppliers chỉ dành cho admin (kể cả GET) — dữ liệu quản trị nội bộ, không public.
router.use(authMiddleware, adminMiddleware);

router.get('/', supplierController.getAll);
router.get('/:id', supplierController.getById);
router.post('/', supplierController.create);
router.put('/:id', supplierController.update);
router.delete('/:id', supplierController.remove);

module.exports = router;
