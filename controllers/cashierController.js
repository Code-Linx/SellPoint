const Order = require('../model/orderModel');
const catchAsync = require('../utils/catchAsync');
const Item = require('../model/itemModel');
const getCurrencySymbol = require('../utils/currency');
const AppSettings = require('../model/settingModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

exports.placeOrder = catchAsync(async (req, res, next) => {
  const { items, customerEmail, customerName } = req.body; // Accept customerName

  // Fetch currency setting
  const settings = await AppSettings.findOne({});
  const currencyCode = settings ? settings.currency : 'USD';
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Calculate total and validate items
  let total = 0;
  const itemDetails = [];

  for (const item of items) {
    console.log(`Checking item: ${item.item}, quantity: ${item.quantity}`);

    const foundItem = await Item.findById(item.item);
    console.log(foundItem); // Log found item details

    if (!foundItem) {
      return next(new AppError(`Item ${item.item} not found.`, 400));
    }

    if (foundItem.quantity < item.quantity) {
      return next(
        new AppError(
          `Insufficient quantity for ${item.item}. Available: ${foundItem.quantity}, Requested: ${item.quantity}`,
          400
        )
      );
    }

    // Deduct the quantity from inventory
    foundItem.quantity -= item.quantity;
    await foundItem.save({ validateBeforeSave: false });

    // Calculate total price
    total += foundItem.price * item.quantity;

    // Store item details for the receipt
    itemDetails.push({
      name: foundItem.name,
      quantity: item.quantity,
      price: `${currencySymbol}${(foundItem.price * item.quantity).toFixed(2)}`,
    });
  }

  // Create the order with customer details
  const order = await Order.create({
    items,
    total,
    cashier: req.user._id,
    customerName, // Add customer name to order
    customerEmail, // Add customer email to order
  });

  // Send receipt to customer's email
  const email = new Email({ email: customerEmail }, null);
  await email.sendReceipt(itemDetails, total, currencySymbol);

  res.status(201).json({
    status: 'success',
    data: {
      order,
    },
  });
});

exports.getCashierDashboardData = catchAsync(async (req, res) => {
  const cashierId = req.user.id;
  // Fetch all items
  const items = await Item.find();

  // Fetch all orders made by the specific cashier
  const orders = await Order.find({ cashier: cashierId }); // Filter orders by cashier ID

  // Calculate total sales amount from orders
  const totalSales = orders.reduce((acc, order) => acc + order.total, 0);
  // Prepare data to send to the dashboard
  const dashboardData = {
    items,
    totalSales,
    totalOrders: orders.length, // Optional: Total number of orders by this cashier
    orders, // Include all orders made by the cashier
  };

  // Add message if no orders found
  if (orders.length === 0) {
    dashboardData.ordersMessage =
      'No orders have been made by this cashier yet.';
    dashboardData.totalSales = 0; // Ensure totalSales is set to 0 if no orders
  } else {
    dashboardData.orders = orders; // Include all orders made by the cashier
  }

  res.status(200).json({
    status: 'success',
    data: dashboardData,
  });
});

exports.getAllOrders = catchAsync(async (req, res) => {
  const cashierId = req.user.id;

  // Fetch all orders made by the specific cashier
  const orders = await Order.find({ cashier: cashierId }); // Filter orders by cashier ID

  if (orders.length === 0) {
    return res.status(200).json({
      status: 'success',
      message: 'No orders found for this cashier.',
      data: [], // Return an empty array for consistency
    });
  }

  res.status(200).json({
    status: 'success',
    data: orders,
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Fetch the order by ID
  const order = await Order.findById(id).populate('cashier'); // Populate cashier details if needed

  if (!order) {
    return next(new AppError(`Order not found with ID: ${id}`, 404));
  }

  // Prepare response data
  const responseData = {
    orderId: order._id,
    items: order.items,
    total: order.total,
    customerName: order.customerName, // Include customer name
    customerEmail: order.customerEmail, // Include customer email
    cashier: order.cashier.name, // Assuming cashier has a name field
  };

  res.status(200).json({
    status: 'success',
    data: responseData,
  });
});
