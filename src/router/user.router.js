const { Router } = require('express')
const userController = require('../controller/user.controller')
const { verifyAccessToken } = require('../middleware/auth.middleware')
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

router.route('/user/me/phone').post(verifyAccessToken,userController.sendPhoneUpdateOtp)
router.route('/user/me/phone/verify').post(verifyAccessToken,userController.verifyPhoneOtpAndUpdate)

module.exports = router
