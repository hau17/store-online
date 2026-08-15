const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Toàn bộ route order yêu cầu đăng nhập -> áp dụng authMiddleware cho cả router
router.use(authMiddleware);

router.post('/', orderController.create);
router.get('/', orderController.getAll);
router.get('/:id', orderController.getById);
router.get('/:id/status', orderController.getStatus);
router.put('/:id/status', adminMiddleware, orderController.updateStatus);
router.delete('/:id', orderController.cancel);

module.exports = router;
