const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Toàn bộ route giỏ hàng yêu cầu đăng nhập -> áp dụng authMiddleware cho cả router
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/', cartController.addItem);
router.put('/:bookId', cartController.updateItem);
router.delete('/:bookId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
