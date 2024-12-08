/* eslint-disable no-undef */
require('dotenv').config();

const crypto = require('crypto');

function generateSignature(secretKey, requestBody) {
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(requestBody)
    .digest('hex');

  return hash;
}

// Example values:
const secretKey = 'sk_test_06d5fbe8d272acf107aebb0495b47953291e9efa'; // Use your environment variable
const requestBody = JSON.stringify({
  event: 'charge.success',
  data: {
    id: '4422825242',
    reference: 'eblss9o8ch',
    status: 'success',
    amount: 700,
    currency: 'NGN',
  },
});

const signature = generateSignature(secretKey, requestBody);
console.log('Generated Signature:', signature);
