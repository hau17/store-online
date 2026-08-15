const express = require('express');
const router = express.Router();
const authorController = require('../controllers/author.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

router.get('/', authorController.getAll);
router.get('/:id', authorController.getById);
router.post('/', authMiddleware, adminMiddleware, authorController.create);
router.put('/:id', authMiddleware, adminMiddleware, authorController.update);
router.delete('/:id', authMiddleware, adminMiddleware, authorController.remove);

module.exports = router;
