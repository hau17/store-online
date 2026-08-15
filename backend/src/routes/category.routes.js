const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', authMiddleware, adminMiddleware, categoryController.create);
router.put('/:id', authMiddleware, adminMiddleware, categoryController.update);
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.remove);

module.exports = router;
