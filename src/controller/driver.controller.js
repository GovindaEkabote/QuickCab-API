// controller/driverController.js
const Driver = require('../model/driver.model')
const {
    emitToUser,
    emitToDriver,
    emitToNearbyUsers
} = require('../service/socketService')
const Ride = require('../model/rider.model')
const Notification = require('../model/notification.model')
const { asyncHandler } = require('../util/asyncHandler')
const httpResponse = require('../util/httpResponse')
const { logger } = require('../util/logger')

exports.completeDriverProfile = asyncHandler(async (req, res) => {
    const { license, vehicle, coordinates } = req.body

    // Validate required fields
    if (!license || !vehicle || !coordinates) {
        return httpResponse(
            req,
            res,
            400,
            'License, vehicle, and coordinates are required'
        )
    }

    // Validate coordinates format
    if (
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        typeof coordinates[0] !== 'number' ||
        typeof coordinates[1] !== 'number'
    ) {
        return httpResponse(
            req,
            res,
            400,
            'Coordinates must be [longitude, latitude]'
        )
    }

    // Verify user is a driver
    if (req.user.role !== 'driver') {
        return httpResponse(
            req,
            res,
            403,
            'Only drivers can complete this profile'
        )
    }

    // Check if profile exists
    // Check if profile exists - UPDATE if exists, CREATE if not
    const driver = await Driver.findOneAndUpdate(
        { user: req.user._id },
        {
            license: {
                ...license,
                verified: false // Reset verification if updating
            },
            vehicle,
            location: {
                type: 'Point',
                coordinates
            },
            status: 'offline', // Reset status on update
            isOnline: false
        },
        {
            new: true,
            upsert: true // Create if doesn't exist
        }
    )

    return httpResponse(req, res, 201, 'Driver profile completed', {
        driver: {
            _id: driver._id,
            license: driver.license,
            vehicle: driver.vehicle,
            status: driver.status
            // Don't expose sensitive/geospatial data in response
        }
    })
})

exports.updateDriverStatus = asyncHandler(async (req, res) => {
    const { status, coordinates } = req.body
    const driverId = req.user._id

    // Validate status
    const validStatuses = ['offline', 'available', 'in_ride', 'busy']
    if (!validStatuses.includes(status)) {
        logger.warn(`Invalid status attempt: ${status}`)
        return httpResponse(
            req,
            res,
            400,
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        )
    }

    // Validate coordinates when going online
    if (status !== 'offline') {
        if (
            !coordinates ||
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
        ) {
            logger.warn('Missing or invalid coordinates for online status')
            return httpResponse(
                req,
                res,
                400,
                'Valid coordinates are required when going online'
            )
        }

        const [lng, lat] = coordinates
        if (
            typeof lng !== 'number' ||
            typeof lat !== 'number' ||
            lng < -180 ||
            lng > 180 ||
            lat < -90 ||
            lat > 90
        ) {
            logger.warn(`Invalid coordinate values: ${coordinates}`)
            return httpResponse(
                req,
                res,
                400,
                'Coordinates must be valid [longitude, latitude] values'
            )
        }
    }

    try {
        const update = {
            status,
            isOnline: status !== 'offline',
            lastStatusUpdate: new Date(),
            ...(status !== 'offline' &&
                coordinates && {
                    location: {
                        type: 'Point',
                        coordinates,
                        lastUpdated: new Date()
                    }
                })
        }

        const driver = await Driver.findOneAndUpdate(
            { user: driverId },
            update,
            { new: true, runValidators: true }
        ).populate('user', 'fullName phoneNumber')

        if (!driver) {
            logger.error(`Driver profile not found for user ${driverId}`)
            return httpResponse(req, res, 404, 'Driver profile not found')
        }

        logger.info(`Driver ${driver._id} status updated to ${status}`)

        // Real-time notifications
        if (status === 'available') {
            try {
                await emitToNearbyUsers(coordinates, 'driver_available', {
                    driverId: driver._id,
                    vehicle: driver.vehicle,
                    coordinates: driver.location?.coordinates,
                    lastUpdated: driver.location?.lastUpdated
                })
            } catch (emitError) {
                logger.error('Failed to emit driver availability:', emitError)
            }
        } else if (status === 'offline') {
            try {
                const activeRide = await Ride.findOne({
                    driver: driver._id,
                    status: { $in: ['accepted', 'arrived', 'in_progress'] }
                })

                if (activeRide) {
                    await emitToUser(activeRide.user, 'driver_went_offline', {
                        rideId: activeRide._id,
                        driverId: driver._id
                    })
                }
            } catch (rideError) {
                logger.error(
                    'Failed to handle offline status for active rides:',
                    rideError
                )
            }
        }

        return httpResponse(
            req,
            res,
            200,
            'Driver status updated successfully',
            {
                status: driver.status,
                isOnline: driver.isOnline,
                lastUpdated: driver.lastStatusUpdate,
                ...(driver.location && { location: driver.location })
            }
        )
    } catch (error) {
        logger.error('Error updating driver status:', error)
        return httpResponse(req, res, 500, 'Failed to update driver status')
    }
})

exports.updateDriverLocation = asyncHandler(async (req, res) => {
    const { coordinates } = req.body

    // Validate coordinates
    if (
        !coordinates ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2
    ) {
        return httpResponse(
            req,
            res,
            400,
            'Coordinates must be an array of [longitude, latitude]'
        )
    }

    // Validate coordinate values
    const [longitude, latitude] = coordinates
    if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
        return httpResponse(
            req,
            res,
            400,
            'Invalid coordinates. Longitude must be between -180 and 180, Latitude between -90 and 90'
        )
    }

    // Update location only if driver is online
    const driver = await Driver.findOneAndUpdate(
        {
            user: req.user._id,
            isOnline: true,
            status: 'available'
        },
        {
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
                lastUpdated: new Date()
            }
        },
        { new: true }
    )

    if (!driver) {
        return httpResponse(req, res, 404, 'Driver not found or not online')
    }

    // Update any active ride with driver's new location
    const activeRide = await Ride.findOne({
        driver: driver._id,
        status: { $in: ['accepted', 'arrived', 'in_progress'] }
    })

    if (activeRide) {
        // Update ride with driver's current location
        await Ride.findByIdAndUpdate(activeRide._id, {
            $push: {
                driverLocations: {
                    coordinates,
                    timestamp: new Date()
                }
            }
        })

        // Notify rider about driver's location update
        emitToUser(activeRide.user, 'driver_location_update', {
            rideId: activeRide._id,
            coordinates,
            timestamp: new Date()
        })
    }

    return httpResponse(req, res, 200, 'Driver location updated successfully', {
        location: {
            coordinates,
            lastUpdated: new Date()
        }
    })
})

exports.getDriverStatus = asyncHandler(async (req, res) => {
    const driver = await Driver.findOne({ user: req.user._id })
        .select('status isOnline location vehicle lastStatusUpdate')
        .lean()

    if (!driver) {
        return httpResponse(req, res, 404, 'Driver profile not found')
    }

    return httpResponse(req, res, 200, 'Driver status retrieved', { driver })
})

exports.acceptRide = asyncHandler(async (req, res) => {
    const { rideId } = req.params
    const userId = req.user._id

    // 1. First check if ride exists at all
    const existingRide = await Ride.findById(rideId)
    if (!existingRide) {
        return httpResponse(req, res, 404, 'Ride not found')
    }

    // 2. Check expiration first (before querying driver)
    if (existingRide.expiresAt < new Date()) {
        return httpResponse(req, res, 400, 'Ride request has expired')
    }

    // 3. Find available driver
    const driver = await Driver.findOne({
        user: userId,
        status: 'available',
        isOnline: true
    }).populate({
        path: 'user',
        select: 'fullName phoneNumber'
    })

    if (!driver) {
        return httpResponse(req, res, 403, 'Driver not available', {
            isOnline: driver?.isOnline,
            status: driver?.status
        })
    }

    // 4. Accept ride with atomic operation
    const ride = await Ride.findOneAndUpdate(
        {
            _id: rideId,
            status: 'requested',
            driver: null,
            expiresAt: { $gt: new Date() } // Still include for race conditions
        },
        {
            $set: {
                status: 'accepted',
                driver: driver._id,
                'timeline.acceptedAt': new Date()
            }
        },
        { new: true }
    ).populate('user')

    if (!ride) {
        // Final fallback check if race condition occurred
        const currentRideState = await Ride.findById(rideId)
        let reason = 'Ride no longer available'
        if (currentRideState?.driver)
            reason = 'Already accepted by another driver'
        if (currentRideState?.status !== 'requested')
            reason = `Ride is ${currentRideState?.status}`

        return httpResponse(req, res, 400, reason)
    }

    // 5. Update driver status
    await Driver.findByIdAndUpdate(driver._id, {
        status: 'in_ride',
        currentRide: rideId
    })

    // 6. Create notification (simplified)
    const estimatedArrival = new Date(
        Date.now() + (ride.estimatedDuration || 0) * 1000
    )
    await Notification.create({
        recipient: ride.user._id,
        recipientType: 'Rider',
        type: 'ride_accepted',
        title: 'Driver On The Way',
        message: `${driver.user.fullName} is coming to pick you up`,
        data: {
            rideId: ride._id,
            driver: {
                name: driver.user.fullName,
                phone: driver.user.phoneNumber
            },
            estimatedArrival
        }
    })

    // 7. Real-time updates
    await emitToUser(ride.user._id.toString(), 'ride_accepted', {
        rideId: ride._id,
        driver: {
            name: driver.user.fullName,
            eta: estimatedArrival
        }
    })

    return httpResponse(req, res, 200, 'Ride accepted successfully', {
        rideId: ride._id,
        status: ride.status,
        driver: {
            id: driver._id,
            name: driver.user.fullName
        }
    })
})
