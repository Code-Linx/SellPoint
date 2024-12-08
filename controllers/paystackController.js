/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

const axios = require('axios');
const Item = require('../model/itemModel');
const Order = require('../model/orderModel');
const Email = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const getCurrencySymbol = require('../utils/currency');
const AppSettings = require('../model/settingModel');

exports.initiatePayment = catchAsync(async (req, res, next) => {
  const { items, email, customerName } = req.body;

  // Validate inputs
  if (!items || !email || !customerName) {
    return next(
      new AppError('Items, email, and customer name are required.', 400)
    );
  }

  // Fetch currency settings
  const settings = await AppSettings.findOne({});
  const currencyCode = settings ? settings.currency : 'NGN'; // Default to NGN
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Calculate total amount and validate items
  let total = 0;
  const metadataItems = [];

  for (const item of items) {
    const foundItem = await Item.findById(item.item);

    if (!foundItem) {
      return next(new AppError(`Item ${item.item} not found.`, 400));
    }

    if (foundItem.quantity < item.quantity) {
      return next(
        new AppError(
          `Insufficient quantity for ${foundItem.name}. Available: ${foundItem.quantity}, Requested: ${item.quantity}`,
          400
        )
      );
    }

    // Calculate total price
    total += foundItem.price * item.quantity;

    // Add to metadata for Paystack
    metadataItems.push({
      name: foundItem.name,
      quantity: item.quantity,
      price: `${currencySymbol}${(foundItem.price * item.quantity).toFixed(2)}`,
    });
  }

  // Convert total to kobo for Paystack
  const totalInKobo = Math.round(total * 100);

  // Metadata to send to Paystack
  const metadata = {
    items: metadataItems,
    customerName,
    customerEmail: email,
  };

  // Initialize payment via Paystack
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: totalInKobo,
        currency: currencyCode,
        metadata,
        callback_url: `${process.env.BASE_URL}/api/v1/user/verify-payment`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.data.status) {
      console.error('Paystack API Error:', response.data);
      return next(new AppError('Failed to initialize payment.', 500));
    }

    res.status(200).json({
      status: 'success',
      data: response.data.data, // Contains authorization_url, access_code, reference
    });
  } catch (error) {
    console.error(
      'Paystack Initialization Error:',
      error.response?.data || error.message
    );
    return next(new AppError('Failed to initialize payment.', 500));
  }
});

// Function to get item ID from the database based on the name
const getItemIdFromName = async (itemName) => {
  try {
    console.log('Searching for item with name:', itemName); // Debug log
    const item = await Item.findOne({ name: itemName });
    if (!item) {
      console.error(`Item not found for name: ${itemName}`);
      return null; // Return null if item is not found
    }
    console.log('Found item:', item); // Debug log
    return item; // Return the full item object
  } catch (error) {
    console.error('Error querying item ID:', error.message);
    return null; // Return null if there was an error
  }
};

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { reference } = req.params;

  if (!reference) {
    return next(new AppError('Payment reference is required.', 400));
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = response.data;

    if (!paymentData.status) {
      return next(new AppError('Payment verification failed.', 500));
    }

    const status = paymentData.data.status;

    let paymentStatus;

    // Set the payment status based on the Paystack webhook response
    if (status === 'success') {
      paymentStatus = 'success';
    } else if (status === 'failed') {
      paymentStatus = 'failed';
    } else if (status === 'pending') {
      paymentStatus = 'pending';
    }

    if (status === 'success') {
      const { amount, currency, metadata } = paymentData.data;
      const { customerName, customerEmail, items } = metadata;

      if (!items || items.length === 0) {
        return next(new AppError('No items provided for the order.', 400));
      }

      console.log('Received items:', items);

      // Fetch currency settings
      const settings = await AppSettings.findOne({});
      const currencyCode = settings ? settings.currency : 'NGN'; // Default to NGN
      const currencySymbol = getCurrencySymbol(currencyCode);

      // Process and validate items
      const processedItems = await Promise.all(
        items.map(async (item, index) => {
          console.log(`Processing item ${index + 1}:`, item);

          if (
            !item.name ||
            !item.quantity ||
            isNaN(parseFloat(item.quantity))
          ) {
            console.error(
              `Invalid quantity for item at index ${index + 1}:`,
              item
            );
            throw new AppError(
              `Invalid quantity for item at index ${index + 1}.`,
              400
            );
          }

          const quantity = parseFloat(item.quantity);
          const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
          if (isNaN(price)) {
            console.error(
              `Invalid price for item at index ${index + 1}:`,
              item.price
            );
            throw new AppError(
              `Invalid price for item at index ${index + 1}.`,
              400
            );
          }

          const foundItem = await getItemIdFromName(item.name);
          if (!foundItem) {
            throw new AppError(
              `Item ID not found for item at index ${index + 1}: ${item.name}.`,
              400
            );
          }

          return {
            item: foundItem._id, // Store the item ID
            name: foundItem.name,
            quantity,
            price: foundItem.price,
          };
        })
      );

      // Create the order with the current user's ID as the cashier
      const order = await Order.create({
        items: processedItems,
        total: amount / 100, // Convert amount from kobo/cents to main unit (e.g., NGN)
        customerName,
        customerEmail,
        cashier: req.user._id, // Assuming `req.user` is set for authenticated users

        paymentStatus,
      });

      // Build itemDetails for the receipt email
      const itemDetails = processedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: `${currencySymbol}${(item.price * item.quantity).toFixed(2)}`,
      }));

      // Set total for email receipt
      const total = amount / 100;

      // After building `itemDetails`, send the email
      try {
        // Send receipt to customer's email
        const email = new Email({ email: customerEmail }, null);
        console.log('Sending receipt email to:', customerEmail);
        await email.sendReceipt(itemDetails, total, currencySymbol);
        console.log('Receipt email sent successfully.');
      } catch (error) {
        console.error('Error sending receipt email:', error.message);
        return next(new AppError('Failed to send receipt email.', 500));
      }

      res.status(200).json({
        status: 'success',
        message: 'Payment verified and order processed successfully.',
        data: paymentData.data,
      });
    } else {
      return next(new AppError('Payment not successful.', 400));
    }
  } catch (error) {
    console.error(
      'Paystack Verification Error:',
      error.response?.data || error.message
    );
    return next(new AppError('Payment verification failed.', 500));
  }
});
