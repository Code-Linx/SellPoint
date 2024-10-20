/* eslint-disable no-unused-vars */
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getUserDashboard = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to your Dashboard',
  });
});

exports.getUserMenu = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to your Menu',
  });
});
