const { Router } = require('express')
const userController = require('../controller/user.controller')
const { verifyAccessToken } = require('../middleware/auth.middleware')
const authorizeRole = require('../middleware/authorizeRole')
const router = Router()

router
    .route('/users/me/email')
    .post(verifyAccessToken, userController.updateEmail)
router
    .route('/users/me/email/verify')
    .put(verifyAccessToken, userController.verifyOTP)
router
    .route('/users/me/email/resend')
    .post(verifyAccessToken, userController.resendOTP)

router
    .route('/user/me/phone')
    .post(verifyAccessToken, userController.sendPhoneUpdateOtp)
router
    .route('/user/me/phone/verify')
    .post(verifyAccessToken, userController.verifyPhoneOtpAndUpdate)
router
    .route('/user/delete')
    .delete(verifyAccessToken, userController.deleteUserAccount)
router
    .route('/admin/update-role')
    .put(verifyAccessToken, authorizeRole('admin'), userController.updateRole)

router
    .route('/admin/suspend-driver')
    .put(
        verifyAccessToken,
        authorizeRole('admin'),
        userController.suspendDriver
    )

router
    .route('/admin/suspend-drivers')
    .get(
        verifyAccessToken,
        authorizeRole('admin'),
        userController.getSuspendedDriver
    )
router
    .route('/admin/suspend-driver/:id')
    .get(
        verifyAccessToken,
        authorizeRole('admin'),
        userController.getSuspendedDriverById
    )

router
    .route('/driver/reactive')
    .post(verifyAccessToken, userController.requestReactivation)

router
    .route('/admin/reactivations/approve')
    .post(
        verifyAccessToken,
        authorizeRole('admin'),
        userController.handleReactivation
    )

router
    .route('/admin/driver/ban')
    .post(
        verifyAccessToken,
        authorizeRole('admin'),
        userController.banDriverPermanently
    )

    router
    .route('/admin/active/driver')
    .get(
        verifyAccessToken,
        authorizeRole('admin'),
        userController.getActiveDrivers
    )

module.exports = router
