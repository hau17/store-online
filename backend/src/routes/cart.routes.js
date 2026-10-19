const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const customerMiddleware = require('../middlewares/customer.middleware');

// Giỏ hàng chỉ dành cho khách hàng đã đăng nhập (admin không có giỏ — spec mục 6.6)
router.use(authMiddleware, customerMiddleware);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:bookId', cartController.updateCartItem);
router.delete('/:bookId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

module.exports = router;
