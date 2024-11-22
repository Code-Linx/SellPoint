const axios = require('axios');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Item = require('../models/itemModel');
const Order = require('../models/orderModel');
const Email = require('../utils/email');

// Helper function to initiate payment
const initiatePaymentWithAPI = async (amount, customerEmail, metadata) => {
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: customerEmail,
      amount: amount * 100, // Convert to kobo (Paystack specific)
      metadata,
    },
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    }
  );
  return response.data.data; // Extract relevant data
};

// Payment initialization endpoint
exports.initiatePayment = catchAsync(async (req, res, next) => {
  const { items, customerEmail, customerName } = req.body;

  // Calculate total amount and validate inventory
  let total = 0;
  for (const item of items) {
    const foundItem = await Item.findById(item.item);
    if (!foundItem)
      return next(new AppError(`Item ${item.item} not found.`, 400));
    if (foundItem.quantity < item.quantity)
      return next(
        new AppError(`Insufficient quantity for item ${item.item}.`, 400)
      );
    total += foundItem.price * item.quantity;
  }

  // Initiate payment
  const paymentResponse = await initiatePaymentWithAPI(total, customerEmail, {
    customerName,
    items,
  });

  res.status(200).json({
    status: 'success',
    message: 'Payment initiated successfully',
    data: paymentResponse,
  });
});

//Payment Webhook Endpoint
//Handles confirmation from the payment provider and places the order upon successful payment.

exports.paymentWebhook = catchAsync(async (req, res, next) => {
  const { event, data } = req.body; // Use Paystack's webhook format

  if (event !== 'charge.success') {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid payment event' });
  }

  const { metadata, amount, customer } = data;
  const { items, customerEmail, customerName } = metadata;

  // Re-validate inventory and calculate totals
  let total = 0;
  const itemDetails = [];
  for (const item of items) {
    const foundItem = await Item.findById(item.item);
    if (!foundItem || foundItem.quantity < item.quantity) {
      return next(
        new AppError(`Validation failed for item ${item.item}.`, 400)
      );
    }
    foundItem.quantity -= item.quantity;
    await foundItem.save({ validateBeforeSave: false });
    total += foundItem.price * item.quantity;
    itemDetails.push({
      name: foundItem.name,
      quantity: item.quantity,
      price: foundItem.price,
    });
  }

  // Create the order
  const order = await Order.create({
    items,
    total: amount / 100, // Convert back to currency format
    customerName,
    customerEmail,
  });

  // Send receipt to the customer
  const email = new Email({ email: customer.email }, null);
  await email.sendReceipt(itemDetails, total);

  res.status(201).json({
    status: 'success',
    message: 'Order placed successfully',
    data: { order },
  });
});
