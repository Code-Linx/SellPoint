/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// tests/register.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // Path to your main app file
const User = require('../model/userModel'); // Import the User model

// Before any tests, connect to the database
beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
});

// After all tests, disconnect from the database
afterAll(async () => {
  await mongoose.connection.close();
});

// Clean up database after each test
afterEach(async () => {
  await User.deleteMany({});
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
    expect(res.body.data.user.name).toBe('Test User'); // Updated to match nested structure
  }, 10000); // Set timeout to 10 seconds
});
