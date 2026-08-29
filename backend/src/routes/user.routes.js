const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Toàn bộ route quản lý khách hàng chỉ dành cho admin (mục 6.11)
router.use(authMiddleware, adminMiddleware);

router.get('/', userController.getCustomers);
router.get('/:id', userController.getCustomerById);
router.put('/:id/lock', userController.lockCustomer);
router.put('/:id/unlock', userController.unlockCustomer);

module.exports = router;
