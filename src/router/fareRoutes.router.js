const { Router } = require('express')
const fareController = require('../controller/fareController.controller')
const { verifyAccessToken } = require('../middleware/auth.middleware')
const authorizeRole = require('../middleware/authorizeRole')
const router = Router()

router
    .route('/fuel-price')
    .post(
        verifyAccessToken,
        authorizeRole('admin'),
        fareController.updateFulePrice
    )
router
    .route('/configuration')
    .post(
        verifyAccessToken,
        authorizeRole('admin'),
        fareController.updateFareConfiguration
    )
router
    .route('/current')
    .get(verifyAccessToken, fareController.getCurrentFareConfiguration)

module.exports = router
