// routes/driverRoutes.js
const { Router } = require('express')
const driverController = require('../controller/driver.controller')
const { verifyAccessToken } = require('../middleware/auth.middleware')
const authorizeRole = require('../middleware/authorizeRole')

const router = Router()

router
    .route('/profile')
    .post(
        verifyAccessToken,
        authorizeRole('driver'),
        driverController.completeDriverProfile
    )

router
    .route('/status')
    .patch(
        verifyAccessToken,
        authorizeRole('driver'),
        driverController.updateDriverStatus
    )

router.patch(
    '/location',
    verifyAccessToken,
    authorizeRole('driver'),
    driverController.updateDriverLocation
)

router.get(
    '/status',
    verifyAccessToken,
    authorizeRole('driver'),
    driverController.getDriverStatus
)

module.exports = router
