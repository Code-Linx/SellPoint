/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const crypto = require('crypto');
const axios = require('axios');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const express = require('express');
const Item = require('../model/itemModel');
const Order = require('../model/orderModel');
const Email = require('../utils/email');

// Helper function to verify webhook signature
const verifyWebhookSignature = (req, secret) => {
  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === signature;
};

// 1. Initiate Payment
exports.initiatePayment = catchAsync(async (req, res, next) => {
  const { amount, email, items, customerName } = req.body;

  if (!amount || !email || !items) {
    return next(new AppError('Amount, email, and items are required', 400));
  }

  // Calculate total amount in kobo
  const totalAmount = Math.round(amount * 100);

  const metadata = {
    items,
    customerEmail: email,
    customerName,
  };

  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: totalAmount,
      currency: 'NGN',
      metadata,
      callback_url: `${process.env.BASE_URL}/success`,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  if (!response.data.status) {
    return next(new AppError('Failed to initialize payment', 500));
  }

  res.status(200).json({
    status: 'success',
    data: response.data.data,
  });
});

// Middleware to parse raw request body for specific route
exports.rawBodyMiddleware = express.raw({ type: 'application/json' });

// 2. Handle Webhook
exports.paystackWebhook = (req, res) => {
  try {
    // Raw body is passed as a Buffer
    const rawBody = req.body;

    // Compute the hash using the webhook secret
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody) // Use raw Buffer
      .digest('hex');

    // Extract Paystack's signature from headers
    const signature = req.headers['x-paystack-signature'];

    // Debugging logs
    console.log('Raw Payload (Buffer):', rawBody.toString());
    console.log('Paystack Signature:', signature);
    console.log('Computed Hash:', hash);

    // Compare computed hash with Paystack's signature
    if (hash !== signature) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid webhook signature',
      });
    }

    // Parse the raw body to JSON
    const event = JSON.parse(rawBody.toString()); // Convert Buffer to string and parse JSON

    // Debug: Log the event
    console.log('Received Event:', event);

    // TODO: Add business logic for charge.success
    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data;
      console.log('Payment Reference:', reference);
      console.log('Amount:', amount);
      console.log('Customer Email:', customer.email);
      console.log('Metadata:', metadata);

      // Example: Process metadata.items and update your database
      const items = metadata.items; // [{ item, quantity }]
      items.forEach(({ item, quantity }) => {
        console.log(`Item: ${item}, Quantity: ${quantity}`);
        // Update item stock or order records here
      });
    }

    // Respond to Paystack
    res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// 3. Place Order Endpoint (if necessary for manual verification)
exports.placeOrder = catchAsync(async (req, res, next) => {
  const { reference } = req.body;

  if (!reference) {
    return next(new AppError('Payment reference is required', 400));
  }

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const { data } = response;
  if (!data.status || data.data.status !== 'success') {
    return next(new AppError('Payment verification failed', 400));
  }

  res.status(201).json({
    status: 'success',
    message: 'Order placed successfully',
  });
});
