const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your last name'],
  },

  email: {
    type: String,
    required: [true, 'Please provide your an email address'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address',
    },
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // Excludes password from query results by default
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please Confirm Password'],
    validate: {
      // This only works on CREATE and SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date, // Track when the password was changed
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  role: {
    enum: ['admin', 'cashier', 'manager'],
    default: 'cashier', // Default role if not specified
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false, // Set to true after email verification
  },
  otp: {
    type: String, // OTP will be stored as a string
  },
  otpExpires: {
    type: Date, // Expiry time for the OTP
  },
});

userSchema.pre('save', async function (next) {
  // 1. Hash the password before saving
  // Only run this function if the password was actually modified
  if (this.isModified('passowrd')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

//Set the passwordChangedAt field
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // Set passwordChangedAt to one second in the past to account for token creation delay
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to generate OTP
userSchema.methods.createOTP = function () {
  const otp = crypto.randomBytes(3).toString('hex'); // Generate a 6-character OTP
  this.otp = crypto.createHash('sha256').update(otp).digest('hex'); // Hash the OTP
  this.otpExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes
  return otp;
};

// Method to verify if OTP is valid
userSchema.methods.correctOTP = function (inputOtp, otpHash) {
  return crypto.createHash('sha256').update(inputOtp).digest('hex') === otpHash;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);
module.exports = User;
