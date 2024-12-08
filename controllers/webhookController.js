/* eslint-disable no-undef */
const crypto = require('crypto');

exports.paystackWebhook = (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY; // Your Paystack secret key
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(req.body)) // Raw body as string
    .digest('hex');

  const signature = req.headers['x-paystack-signature'];

  if (hash === signature) {
    console.log('Webhook verified:', req.body);
    res.sendStatus(200);
  } else {
    console.error('Invalid webhook signature');
    res.sendStatus(403);
  }
};
