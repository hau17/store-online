const express = require('express');
const router = express.Router();
const publisherController = require('../controllers/publisher.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

router.get('/', publisherController.getAll);
router.get('/:id', publisherController.getById);
router.post('/', authMiddleware, adminMiddleware, publisherController.create);
router.put('/:id', authMiddleware, adminMiddleware, publisherController.update);
router.delete('/:id', authMiddleware, adminMiddleware, publisherController.remove);

module.exports = router;
