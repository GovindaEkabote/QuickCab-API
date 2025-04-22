const { Router } = require('express')
const userController = require('../controller/auth.controller')
const { profileImageUpload } = require('../middleware/fileHandler.middleware')
const {
    verifyRefreshToken,
    verifyAccessToken
} = require('../middleware/auth.middleware')
const passport = require('passport')
const router = Router()

router.route('/register').post(userController.registerUser)
router
    .route('/auth/verify-registration')
    .post(userController.verifyRegistrationOtp)
router.route('/login-with-phone').post(userController.loginWithPhone)
router.route('/verify-login').post(userController.verifyLoginOtp)

router.route('/profile-image').post(
    verifyRefreshToken,
    (req, res, next) => {
        profileImageUpload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                })
            }
            next()
        })
    },
    userController.uploadProfileImage
)

router
    .route('/delete-profile')
    .delete(verifyAccessToken, userController.deleteProfileImage)
router
    .route('/update-profile')
    .put(verifyAccessToken, userController.updateUserProfile)
router.route('/get-user/:userId').get(userController.getUserById)
router.route('/get-logout').get(verifyAccessToken, userController.logoutUser)

router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email', 'openid'] })
)
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    userController.socialLoginCallback
)
router.get('/check-login', verifyAccessToken, userController.checkLoginStatus)

// Facebook Auth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), userController.socialLoginCallback);


module.exports = router
