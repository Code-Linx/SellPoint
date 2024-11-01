/* eslint-disable no-unused-vars */
const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');
const adminController = require('../controllers/managerController');
const router = express.Router();

router.post('/register', adminAuthController.register);
router.post(
  '/resendCode',
  adminAuthController.resendVerificationLimiter,
  adminAuthController.resendVerificationCode
);
router.post('/verifyEmail', adminAuthController.verifyEmail);
router.post('/login', adminAuthController.login);

//ROUTES TO RESET PASSWORD/FORGET PASSWORD
router.post(
  '/forgetPassword',
  adminAuthController.passwordResetLimiter,
  adminAuthController.resetpassword
);

router.post('/verifyResetCode', adminAuthController.verifyResetCode);
router.post(
  '/resendPasswordCode',
  adminAuthController.passwordResetLimiter,
  adminAuthController.requestNewCode
);

//PROTECTED ROUTES
router.use(adminAuthController.protect);
// ================== Admin Routes ==================
router.use(adminAuthController.restrictTo('admin'));
router.get('/getAllItems', adminController.getItems);
router.get('/fetchAllCashiers', adminController.getAllCashier);
router.get('/fechAllOrders', adminController.getAllOrders);
router.get('/fetchItemById/:id', adminController.getitemByID);
router.get('/deleted-categories', adminController.getDeletedCategories);
router.get('/deteled-categories-item', adminController.getDeletedcategoryItem);
router.get('/fetchOrderByID/:id', adminController.getOrderById);
router.get('/fetchAdminDashBoard', adminController.getAdminDashboard);

router.post('/createNewItem', adminController.addNewItem);
router.post('/createNewCategory', adminController.addCategory);
router.post('/fecthSalesStats', adminController.getSalesStats);

router.patch('/updateCurrency', adminController.updateCurrency);
router.patch('/updateitemByID/:id', adminController.updateItem);
router.patch('/updatecategoryByID/:id', adminController.updateCategory);
router.patch('/deletecategoryByID/:id', adminController.deleteCategory);
router.patch('/editAdminProfile', adminController.updateAdminDetails);
router.patch('/updateAdminPassword', adminController.updateAdminPassword);

router.delete('/deleteItemByID/:id', adminController.deleteItem);
router.delete('/deleteCashier/:id', adminController.deleteCashier);
router.delete(
  '/remove-deleted-categories-item',
  adminController.removeDeletedCategoryItem
);
router.delete(
  '/remove-deleted-categories',
  adminController.removeDeletedcategories
);

module.exports = router;
