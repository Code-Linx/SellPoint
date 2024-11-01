const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');
const adminController = require('../controllers/managerController');
const router = express.Router();

router.post('/register', adminAuthController.register);
router.post(
  '/resend-otp',
  adminAuthController.resendVerificationLimiter,
  adminAuthController.resendVerificationCode
);
router.post('/verify-email', adminAuthController.verifyEmail);
router.post('/login', adminAuthController.login);

//ROUTES TO RESET PASSWORD/FORGET PASSWORD
router.post(
  '/forget-password',
  adminAuthController.passwordResetLimiter,
  adminAuthController.resetpassword
);

router.post('/verify-password-reset-otp', adminAuthController.verifyResetCode);
router.post(
  '/resend-password-reset-otp',
  adminAuthController.passwordResetLimiter,
  adminAuthController.requestNewCode
);

//PROTECTED ROUTES
router.use(adminAuthController.protect);
// ================== Admin Routes ==================
router.use(adminAuthController.restrictTo('admin'));
router.get('/items', adminController.getItems);
router.get('/cashiers', adminController.getAllCashier);
router.get('/orders', adminController.getAllOrders);
router.get('/:id/item', adminController.getitemByID);
router.get('/deleted-categories', adminController.getDeletedCategories);
router.get('/deteled-categories-item', adminController.getDeletedcategoryItem);
router.get('/:id/order', adminController.getOrderById);
router.get('/admin-dashboard', adminController.getAdminDashboard);

router.post('/new-item', adminController.addNewItem);
router.post('/new-category', adminController.addCategory);
router.post('/sales-stats', adminController.getSalesStats);

router.patch('/update-currency', adminController.updateCurrency);
router.patch('/update/:id/item', adminController.updateItem);
router.patch('/update/:id/category', adminController.updateCategory);
router.patch('/delete/:id/category', adminController.deleteCategory);
router.patch('/edit-admin-profile', adminController.updateAdminDetails);
router.patch('/update-admin-password', adminController.updateAdminPassword);

router.delete('/delete/:id/item', adminController.deleteItem);
router.delete('/delete/:id/Cashier', adminController.deleteCashier);
router.delete(
  '/remove-deleted-categories-item',
  adminController.removeDeletedCategoryItem
);
router.delete(
  '/remove-deleted-categories',
  adminController.removeDeletedcategories
);

module.exports = router;
