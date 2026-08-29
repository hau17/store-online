const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Toàn bộ route order yêu cầu đăng nhập -> áp dụng authMiddleware cho cả router
router.use(authMiddleware);

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.get('/:id/status', orderController.getOrderStatus);
router.put('/:id/status', adminMiddleware, orderController.updateOrderStatus);
router.delete('/:id', orderController.cancelOrder);

module.exports = router;
