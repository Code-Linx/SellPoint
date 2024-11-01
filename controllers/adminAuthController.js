/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const Admin = require('../model/adminModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
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
  res.cookie('jwt', token, cookieOptions);

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
  const admin = await Admin.findOne({ email: req.body.email });
  if (admin) {
    return next(new AppError('admin already exists', 400));
  }

  // 2. Create new user without saving it yet
  const newUser = await Admin.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 3. Generate Email Verification Code
  const verificationCode = await newUser.createEmailVerificationCode();

  // 4. Send Verification Code (via email or any other method)
  await new Email(newUser, verificationCode).sendEmailVerification();

  // 5. Save the user with the new fields
  await newUser.save({ validateBeforeSave: false }); // Save the user again to persist the verification code and expiration

  // 6. Send response
  createSendToken(newUser, 201, res);
});

// Create a rate limiter middleware for resend verification route
exports.resendVerificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes window
  max: 3, // Limit each IP to 3 requests per window (here, 3 resend requests in 15 mins)
  message: 'Too many requests, please try again after 1 minutes.', // Custom message for too many requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

exports.resendVerificationCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // 1. Find the user by their email
  const admin = await Admin.findOne({ email });

  if (!admin) {
    return next(
      new AppError('There is no admin with that email address.', 404)
    );
  }

  // 2. Check if the admin is already verified
  if (admin.isVerified) {
    return next(new AppError('This admin is already verified.', 400));
  }

  // 3. Generate a new email verification code
  const newVerificationCode = await admin.createEmailVerificationCode();

  // 4. Save the admin with the new verification code and updated expiration time
  await admin.save({ validateBeforeSave: false });

  // 5. Send the new verification code via email (or SMS, etc.)
  await new Email(admin, newVerificationCode).sendEmailVerification(); // Implement the email sending logic

  // 6. Send a response back to the admin
  res.status(200).json({
    status: 'success',
    message: 'Verification code sent! Please check your email.',
  });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  // 1. Find the admin based on the email
  const admin = await Admin.findOne({ email: req.body.email });

  if (!admin) {
    return next(new AppError('admin not found', 404));
  }

  // 2. Hash the provided code and check if it matches the stored hashed code
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

  // 3. Check if the hashed code matches and hasn't expired
  if (
    admin.emailVerificationCode !== hashedCode ||
    Date.now() > admin.emailVerificationExpires
  ) {
    return next(new AppError('Invalid or expired verification code', 400));
  }

  // 4. If valid, mark the email as verified and clear the code
  admin.isVerified = true;
  admin.emailVerificationCode = undefined; // Clear the verification code
  admin.emailVerificationExpires = undefined; // Clear the expiration time
  await admin.save({ validateBeforeSave: false });

  // 5. Send success response
  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully!',
  });
});

exports.login = catchAsync(async (req, res, next) => {
  //1. Check if email and password are specified
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('Please Provide Email and Password!', 401));
  //2. Check if user exists
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) return next(new AppError('User Does not exist', 404));
  //3 compare pasword
  if (!(await admin.correctPassword(password, admin.password)))
    return next(new AppError('Invalid credentials', 401));
  //4 check is user email is verified
  if (!admin.isVerified)
    return next(new AppError('Please verify your email', 403));
  createSendToken(admin, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // Use Passport to authenticate the JWT
  passport.authenticate(
    'admin',
    { session: false },
    async (err, user, info) => {
      if (err || !user) {
        return next(
          new AppError(
            'You are not logged in! Please log in to get access.',
            401
          )
        );
      }

      // Attach the authenticated user to the request object
      req.user = user;

      // 1) Check if the user still exists in the database
      const currentUser = await Admin.findById(req.user._id);
      if (!currentUser) {
        return next(
          new AppError(
            'The user belonging to this token no longer exists.',
            404
          )
        );
      }

      // 2) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(req.user.iat)) {
        return next(
          new AppError(
            'User recently changed password! Please log in again.',
            401
          )
        );
      }

      // Attach the user to res.locals to access user data in views (optional)
      res.locals.user = currentUser;

      // Proceed to the next middleware or route handler
      next();
    }
  )(req, res, next);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Set the token to expire in 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'You have been logged out!',
  });
};
exports.resetpassword = catchAsync(async (req, res, next) => {
  // 1. Find the user based on the email
  const admin = await Admin.findOne({ email: req.body.email });

  if (!admin) {
    return next(new AppError('admin not found', 404));
  }

  // 2) Generate the reset code
  const resetCode = admin.createPasswordResetCode();

  // 3) Save the reset code and expiration to the user document
  await admin.save({ validateBeforeSave: false });

  // 4) Send the reset code to the user's email
  try {
    await new Email(admin, resetCode).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Reset code sent to email!',
    });
  } catch (err) {
    console.log('error:', err);
    admin.passwordResetCode = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.passwordResetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window
  max: 3, // 3 requests per 1 minutes
  message: 'Too many password reset requests, please try again later.',
});

// Controller method to handle requesting a new reset code
exports.requestNewCode = catchAsync(async (req, res, next) => {
  const admin = await Admin.findOne({ email: req.body.email }); // Get the email from the request body

  if (!admin) {
    return next(
      new AppError('There is no admin with this email address.', 404)
    );
  }

  // Create a new reset code and expiration
  const resetCode = admin.createPasswordResetCode(); // Assuming you have this method implemented
  await admin.save({ validateBeforeSave: false });

  // Send the reset code via email (implement your own email sending logic here)
  await new Email(admin, resetCode).sendPasswordReset();

  res.status(200).json({
    status: 'success',
    message: 'A new reset code has been sent to your email.',
  });
});

exports.verifyResetCode = catchAsync(async (req, res, next) => {
  // 1) Find the user by reset code and ensure the code has not expired
  const admin = await Admin.findOne({
    passwordResetCode: req.body.resetCode,
    passwordResetExpires: { $gt: Date.now() }, // Check if code hasn't expired
  });

  if (!admin) {
    return next(new AppError('Reset code is invalid or has expired.', 400));
  }

  // 2) If code is valid, update the password
  admin.password = req.body.password;
  admin.passwordConfirm = req.body.passwordConfirm;
  admin.passwordResetCode = undefined; // Clear the reset code
  admin.passwordResetExpires = undefined; // Clear the expiration time

  await admin.save();

  // 3) Send success response and possibly log the user in again (optional)
  res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully.',
  });
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};