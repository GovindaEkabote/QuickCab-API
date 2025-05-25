const { Router } = require('express')
const { verifyAccessToken } = require('../middleware/auth.middleware')
const rideController = require('../controller/rider.controller')
const authorizeRole = require('../middleware/authorizeRole')
const router = Router()

router.route('/request').post(verifyAccessToken, rideController.requestRide)

module.exports = router
