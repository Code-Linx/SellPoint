/* eslint-disable no-unused-vars */
const catchAsync = require('../utils/catchAsync');
const Item = require('../model/itemModel');
const Order = require('../model/orderModel');
const Category = require('../model/categoryModel');
const AppSettings = require('../model/settingModel');
const getCurrencySymbol = require('../utils/currency');
const Email = require('../utils/email');
const AppError = require('../utils/appError');

exports.updateCurrency = catchAsync(async (req, res, next) => {
  // Update the currency setting
  const updatedSettings = await AppSettings.findOneAndUpdate(
    {},
    { currency: req.body.currency },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: updatedSettings,
  });
});

// Controller to add a new category
exports.addCategory = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  // Check if category already exists
  const categoryExists = await Category.findOne({ name });
  if (categoryExists) {
    return next(new AppError('Category already exists', 400));
  }

  // Create the new category
  const newCategory = await Category.create({ name, description });
  res.status(201).json({
    status: 'success',
    data: {
      category: newCategory,
    },
  });
});

// Controller to add a new item to a category
exports.addNewItem = catchAsync(async (req, res, next) => {
  const { name, description, quantity, category, price } = req.body;
  // Check if category exists
  const categoryExists = await Category.findOne({ name: category });
  if (!categoryExists) {
    return next(new AppError('Category does not exist', 400));
  }

  // Validate required fields
  if (!name || !price || !quantity || !category || !description) {
    return res.status(400).json({
      status: 'fail',
      message:
        'Please provide all required fields: name, price, quantity, category',
    });
  }

  // Create the new item
  const newItem = await Item.create({
    name,
    description,
    quantity,
    price,
    category: categoryExists._id,
  });

  // Fetch currency setting from AppSettings
  const settings = await AppSettings.findOne({});
  const currencyCode = settings ? settings.currency : 'USD'; // Default to USD if not set
  const currencySymbol = getCurrencySymbol(currencyCode); // Get the currency symbol

  res.status(201).json({
    status: 'success',
    data: {
      item: {
        name: newItem.name,
        description: newItem.description,
        quantity: newItem.quantity,
        price: `${currencySymbol}${newItem.price}`, // Prefix currency symbol to the price
        category: categoryExists.name, // Return the category name instead of the ID
      },
    },
  });
});

exports.getItems = catchAsync(async (req, res, next) => {
  // Fetch all categories that are not deleted
  const validCategories = await Category.find({ deleted: false });

  // Fetch currency setting
  const settings = await AppSettings.findOne({});
  const currencyCode = settings ? settings.currency : 'USD'; // Default to 'USD' if not set

  // Get currency symbol from the utility function
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Fetch items that are associated with valid categories
  const items = await Item.find({
    category: { $in: validCategories.map((cat) => cat._id) },
  });

  // Include currency symbol in the output
  const itemsWithCurrency = items.map((item) => ({
    name: item.name,
    description: item.description,
    price: `${currencySymbol}${item.price}`, // Prefix currency symbol to the price
    quantity: item.quantity,
    category: item.category,
  }));

  res.status(200).json({
    status: 'success',
    data: itemsWithCurrency,
  });
});

exports.getitemByID = catchAsync(async (req, res, next) => {
  // Fetch currency setting
  const settings = await AppSettings.findOne({});
  const currencyCode = settings ? settings.currency : 'USD'; // Default to 'USD' if not set

  // Get currency symbol from the utility function
  const currencySymbol = getCurrencySymbol(currencyCode);

  const item = await Item.findById(req.params.id);

  // Check if the item exists
  if (!item) {
    return next(new AppError('No item found with that ID', 404)); // Return an error if the item is not found
  }

  // Include currency symbol in the output
  const itemWithCurrency = {
    name: item.name,
    description: item.description,
    price: `${currencySymbol}${item.price}`, // Prefix currency symbol to the price
    quantity: item.quantity,
    category: item.category,
  };
  res.status(200).json({
    status: 'success',
    data: itemWithCurrency,
  });
});

exports.updateItem = catchAsync(async (req, res, next) => {
  const { name, price, quantity } = req.body;

  // Find the item by ID
  const item = await Item.findById(req.params.id);

  // Check if the item exists
  if (!item) {
    return next(new AppError('No item found with that ID', 404));
  }

  // Update item properties if they are provided in the request body
  if (name) item.name = name;
  if (price) item.price = price;
  if (quantity) item.quantity = quantity;

  // Save the updated item
  await item.save();

  // Fetch currency setting
  const settings = await AppSettings.findOne({});
  const currencyCode = settings ? settings.currency : 'USD'; // Default to 'USD' if not set

  // Get currency symbol from the utility function
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Prepare the response
  const updatedItem = {
    name: item.name,
    description: item.description,
    price: `${currencySymbol}${item.price}`, // Prefix currency symbol to the price
    quantity: item.quantity,
    category: item.category,
  };

  res.status(200).json({
    status: 'success',
    data: updatedItem,
  });
});

exports.deleteItem = catchAsync(async (req, res, next) => {
  const item = await Item.findById(req.params.id);

  // Check if the item exists
  if (!item) {
    return next(new AppError('No item found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  // Find the category by ID
  const category = await Category.findById(req.params.id);

  // Check if the category exists
  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  // Update category properties if they are provided in the request body
  if (name) category.name = name;
  if (description) category.description = description;

  // Save the updated category
  await category.save();

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  const categoryId = req.params.id;

  // Find the category by ID
  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  // Perform soft delete
  category.deleted = true; // Mark as deleted
  await category.save();

  res.status(200).json({
    status: 'success',
    message: 'Category marked as deleted',
    data: {
      category,
    },
  });
});

exports.getDeletedCategories = catchAsync(async (req, res, next) => {
  const deletedCategories = await Category.find({ deleted: true });
  res.status(200).json({
    status: 'success',
    data: {
      categories: deletedCategories,
    },
  });
});

exports.removeDeletedcategories = catchAsync(async (req, res, next) => {
  // Delete categories that are marked as deleted
  const result = await Category.deleteMany({ deleted: true });

  res.status(204).json({
    status: 'success',
    message: 'Deleted categories have been permanently removed',
    data: {
      deletedCount: result.deletedCount, // Return the number of deleted categories
    },
  });
});

exports.getDeletedcategoryItem = catchAsync(async (req, res, next) => {
  const deletedCategories = await Category.find({ deleted: true });
  const deletedCategoryIds = deletedCategories.map((cat) => cat._id);

  const items = await Item.find({ category: { $in: deletedCategoryIds } });

  res.status(200).json({
    status: 'success',
    data: {
      items,
    },
  });
});

exports.removeDeletedCategoryItem = catchAsync(async (req, res, next) => {
  // Find deleted categories
  const deletedCategories = await Category.find({ deleted: true });
  const deletedCategoryIds = deletedCategories.map((cat) => cat._id);

  // Delete items associated with deleted categories
  const result = await Item.deleteMany({
    category: { $in: deletedCategoryIds },
  });

  res.status(204).json({
    status: 'success',
    message: 'Items associated with deleted categories have been removed',
    data: {
      deletedCount: result.deletedCount, // Return the number of deleted items
    },
  });
});

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find();

  if (orders.length === 0) {
    return res.status(200).json({
      status: 'success',
      message: 'No orders Yets.',
    });
  }

  res.status(200).json({
    status: 'success',
    data: orders,
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  // Find the item by ID
  const order = await Order.findById(req.params.id);

  // Check if the order exists
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: order,
  });
});

exports.getSalesStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.body;

  // Validate that both dates are provided
  if (!startDate || !endDate) {
    return next(new AppError('Both startDate and endDate are required', 400));
  }

  // Parse dates
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  // Validate dates
  if (isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
    return next(new AppError('Invalid date format', 400));
  }

  // Fetch sales data and order history
  const salesData = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: parsedStartDate,
          $lt: parsedEndDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$total' },
        totalOrders: { $sum: 1 },
        orders: { $push: '$$ROOT' }, // Collect all orders in an array
      },
    },
  ]);

  // If no sales data found
  if (salesData.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'No sales data found for the specified period.',
    });
  }

  // Prepare the email report
  const reportData = {
    totalSales: salesData[0].totalSales,
    totalOrders: salesData[0].totalOrders,
    orderHistory: salesData[0].orders, // Add order history to the report data
  };

  const email = new Email({ email: 'admin@example.com' }, null); // Replace with actual admin email
  await email.sendSalesReport(
    parsedStartDate,
    parsedEndDate,
    reportData.orderHistory,
    reportData
  );

  // Respond with sales data
  res.status(200).json({
    status: 'success',
    data: {
      totalSales: reportData.totalSales,
      totalOrders: reportData.totalOrders,
      orderHistory: reportData.orderHistory, // Optionally include order history in the API response
    },
  });
});
