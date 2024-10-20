const express = require('express');
const authController = require('../controllers/authController');

const userController = require('../controllers/usersController');
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
router.use(authController.protect);
router.get('/dashboard', userController.getUserDashboard);
router.get('/menu', userController.getUserMenu);

module.exports = router;
