/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// tests/register.test.js

const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../model/userModel');

// Before any tests, connect to the database
beforeAll(async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {});
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
});

// After all tests, disconnect from the database
afterAll(async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing the database connection:', error);
  }
});

// Clean up database after each test
afterEach(async () => {
  try {
    await User.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up database:', error);
  }
});

describe('User API', () => {
  it('should create a user profile with valid data', async () => {
    const userData = {
      name: 'Test User',
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
    };

    const res = await request(app).post('/api/v1/user/register').send(userData);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('data.user'); // Adjusted path to match response structure
  }, 15000); // Set timeout to 15 seconds
});

describe('User Email Verification', () => {
  it('should verify user email with valid code', async () => {
    // Step 1: Create a user with an email verification code
    const email = 'testuser@example.com';
    const verificationCode = '123456';
    const hashedCode = crypto
      .createHash('sha256')
      .update(verificationCode)
      .digest('hex');
    const emailVerificationExpires = Date.now() + 10 * 60 * 1000; // Set expiry 10 minutes from now

    const user = await User.create({
      name: 'Test User',
      email,
      password: 'password123',
      passwordConfirm: 'password123',
      emailVerificationCode: hashedCode,
      emailVerificationExpires,
      isVerified: false,
    });

    // Step 2: Send the verification request
    const res = await request(app).post('/api/v1/user/verifyEmail').send({
      email,
      code: verificationCode,
    });

    // Step 3: Assert the response
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'Email verified successfully!');

    // Step 4: Verify that the user's email is marked as verified
    const verifiedUser = await User.findOne({ email });
    expect(verifiedUser.isVerified).toBe(true);
    expect(verifiedUser.emailVerificationCode).toBeUndefined();
    expect(verifiedUser.emailVerificationExpires).toBeUndefined();
  }, 15000); // Set timeout to 15 seconds
});

describe('Resend Verification Code', () => {
  it('should resend a verification code to an unverified user', async () => {
    // Step 1: Create a user who is not verified
    const user = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      isVerified: false,
      emailVerificationCode: 'initialCode',
      emailVerificationExpires: Date.now() + 10 * 60 * 1000, // 10 minutes from now
    });

    // Step 2: Send the resend verification code request
    const res = await request(app)
      .post('/api/v1/user/resendCode')
      .send({ email: user.email });

    // Step 3: Check the response
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty(
      'message',
      'Verification code sent! Please check your email.'
    );

    // Step 4: Verify that the user's verification code is updated
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.emailVerificationCode).not.toBe('initialCode'); // Check that it's not the same
    expect(updatedUser.emailVerificationExpires.getTime()).toBeGreaterThan(
      Date.now()
    ); // Ensure the expiration time is updated
  });

  it('should return an error if the user is already verified', async () => {
    const verifiedUser = await User.create({
      name: 'Verified User',
      email: 'verifieduser@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      isVerified: true,
    });

    const res = await request(app)
      .post('/api/v1/user/resendCode')
      .send({ email: verifiedUser.email });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      'message',
      'This user is already verified.'
    );
  });

  it('should return an error if the user does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/user/resendCode')
      .send({ email: 'nonexistent@example.com' });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty(
      'message',
      'There is no user with that email address.'
    );
  });
});

describe('User Login', () => {
  it('should log in an existing user with valid credentials', async () => {
    // Step 1: Create a user to test logging in
    const user = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      isVerified: true, // Ensure the user is verified
    });

    // Step 2: Send the login request
    const res = await request(app).post('/api/v1/user/login').send({
      email: user.email,
      password: 'password123',
    });

    // Step 3: Assert the response
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('token'); // Assuming your createSendToken sends a token
  });

  it('should return an error if the email or password is not provided', async () => {
    const res = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'testuser@example.com' }); // Missing password

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty(
      'message',
      'Please Provide Email and Password!'
    );
  });

  it('should return an error if the user does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message', 'User Does not exist');
  });

  it('should return an error if the password is incorrect', async () => {
    // Create a verified user
    await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      isVerified: true,
    });

    const res = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'testuser@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should return an error if the user email is not verified', async () => {
    // Create a user who is not verified
    await User.create({
      name: 'Unverified User',
      email: 'unverified@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      isVerified: false,
    });

    const res = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'unverified@example.com', password: 'password123' });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('message', 'Please verify your email');
  });
});
