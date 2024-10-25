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
//PROTECTED ROUTES
router.use(authController.protect);
router.post('/signOut', authController.logout);
router.use(authController.restrictTo('cashier'));
//CASHIER ONLY ROUTE
router.get('/cashierDashboard', cashierController.getCashierDashboardData);
router.get('/fetchAllOrder', cashierController.getAllOrders);
router.get('/fetchOrderById/:id', cashierController.getOrderById);
router.post('/calculateOrder', cashierController.placeOrder);
//ADMIN ONLY ROUTES
router.use(authController.restrictTo('admin'));
router.get('/getAllItems', adminController.getItems);
router.get('/fetchItemById/:id', adminController.getitemByID);
router.get('/deleted-categories', adminController.getDeletedCategories);
router.get('/deteled-categories-item', adminController.getDeletedcategoryItem);
router.post('/createNewItem', adminController.addNewItem);
router.post('/createNewCategory', adminController.addCategory);
router.patch('/updateCurrency', adminController.updateCurrency);
router.patch('/updateitemByID/:id', adminController.updateItem);
router.patch('/updatecategoryByID/:id', adminController.updateCategory);
router.patch('/deletecategoryByID/:id', adminController.deleteCategory);
router.delete('/deleteItemByID/:id', adminController.deleteItem);
router.delete(
  '/remove-deleted-categories-item',
  adminController.removeDeletedCategoryItem
);
router.delete(
  '/remove-deleted-categories',
  adminController.removeDeletedcategories
);

module.exports = router;
