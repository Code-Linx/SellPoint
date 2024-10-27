/* eslint-disable no-unused-vars */
const express = require('express');
const authController = require('../controllers/authController');
const adminController = require('../controllers/managerController');
const cashierController = require('../controllers/cashierController');
const router = express.Router();

router.post('/register', authController.register);
router.post(
  '/resendCode',
  authController.resendVerificationLimiter,
  authController.resendVerificationCode
);
router.post('/verifyEmail', authController.verifyEmail);
router.post(
  '/forgetPassword',
  authController.passwordResetLimiter,
  authController.resetpassword
);

router.post('/verifyResetCode', authController.verifyResetCode);
router.post(
  '/resendPasswordCode',
  authController.passwordResetLimiter,
  authController.requestNewCode
);
router.post('/login', authController.login);
router.post('/signOut', authController.logout);
//PROTECTED ROUTES
router.use(authController.protect);
router.use(authController.restrictTo('cashier'));
//CASHIER ONLY ROUTE
router.get('/cashierDashboard', cashierController.getCashierDashboardData);
router.get('/fetchAllOrder', cashierController.getAllOrders);
router.get('/fetchOrderById/:id', cashierController.getOrderById);
router.post('/calculateOrder', cashierController.placeOrder);

module.exports = router;
