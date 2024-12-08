const express = require('express');
const webhookController = require('../controllers/webhookController');
const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookController.paystackWebhook
);

module.exports = router;
