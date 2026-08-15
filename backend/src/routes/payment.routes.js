const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Endpoint webhook: public (không cần JWT của user), verify bằng SEPAY_WEBHOOK_SECRET
// sẽ được kiểm tra ngay trong controller ở bước code logic sau (mục 6.6, bước 1 trong spec).
router.post('/sepay', paymentController.sepayWebhook);

module.exports = router;
