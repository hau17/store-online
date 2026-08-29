const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Toàn bộ route giỏ hàng yêu cầu đăng nhập -> áp dụng authMiddleware cho cả router
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:bookId', cartController.updateCartItem);
router.delete('/:bookId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

module.exports = router;
