const express = require('express');
const authController = require('../controllers/authController');
const cashierController = require('../controllers/cashierController');
//const stripeController = require('../controllers/stripeController');
const paystackController = require('../controllers/paystackController');
const router = express.Router();

router.post('/register', authController.register);
router.post(
  '/resend-otp',
  authController.resendVerificationLimiter,
  authController.resendVerificationCode
);
router.post('/verify-email', authController.verifyEmail);
router.post(
  '/forget-password',
  authController.passwordResetLimiter,
  authController.resetpassword
);

router.post('/verify-password-reset-otp', authController.verifyResetCode);
router.post(
  '/resend-password-reset-otp',
  authController.passwordResetLimiter,
  authController.requestNewCode
);
router.post('/login', authController.login);
router.post('/signOut', authController.logout);
//PROTECTED ROUTES
router.use(authController.protect);
router.use(authController.restrictTo('cashier'));
//CASHIER ONLY ROUTE
router.get('/cashier-dashboard', cashierController.getCashierDashboardData);
router.get('/cashier-orders', cashierController.getAllOrders);
router.get('/cashier/:id/order', cashierController.getOrderById);
router.get('/items', cashierController.getAllItems);
router.post('/new-order', cashierController.placeOrder);
router.patch('/cashier-data', cashierController.updateCashierDetails);
router.patch(
  '/update-cashier-password',
  cashierController.updateCashierPassword
);

router.post('/initiate-payment', paystackController.initiatePayment);
router.post(
  '/webhook',
  paystackController.rawBodyMiddleware,
  paystackController.paystackWebhook
);
router.post('/place-order', paystackController.placeOrder);

module.exports = router;
