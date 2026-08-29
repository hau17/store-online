const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Endpoint webhook: public (không cần JWT của user, không dùng auth.middleware/admin.middleware),
// tự verify bằng SEPAY_WEBHOOK_SECRET ngay trong controller (bước a, mục 6.8 trong spec).
router.post('/sepay', paymentController.handleSepayWebhook);

module.exports = router;
