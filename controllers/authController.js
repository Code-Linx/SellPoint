/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const User = require('../model/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Email = require('../utils/email');

// Helper function to sign a JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper function to send the token and response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  res.cookie('jwt', token, cookieOptions); // Ensure `res` is the Express response object

  user.password = undefined; // Ensure password is not sent in response

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.register = catchAsync(async (req, res, next) => {
  console.log(req.body);
  // 1. Check if the user already exists
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    return next(new AppError('User already exists', 400));
  }

  // 2. Create new user without saving it yet
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 3. Generate Email Verification Code
  const verificationCode = await newUser.createEmailVerificationCode();

  // 4. Send Verification Code (via email or any other method)
  await new Email(newUser, verificationCode).sendEmailVerification(); // Make sure to modify this method to handle sending the code

  // 5. Save the user with the new fields
  await newUser.save({ validateBeforeSave: false }); // Save the user again to persist the verification code and expiration

  // 6. Send response
  createSendToken(newUser, 201, res);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  // 1. Find the user based on the email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // 2. Hash the provided code and check if it matches the stored hashed code
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

  // 3. Check if the hashed code matches and hasn't expired
  if (
    user.emailVerificationCode !== hashedCode ||
    Date.now() > user.emailVerificationExpires
  ) {
    return next(new AppError('Invalid or expired verification code', 400));
  }

  // 4. If valid, mark the email as verified and clear the code
  user.isVerified = true;
  user.emailVerificationCode = undefined; // Clear the verification code
  user.emailVerificationExpires = undefined; // Clear the expiration time
  await user.save({ validateBeforeSave: false });

  // 5. Send success response
  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully!',
  });
});
