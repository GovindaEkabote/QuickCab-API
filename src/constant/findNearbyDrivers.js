const Driver = require('../model/driver.model')
const Notification = require('../model/notification.model')
const { emitToDriver } = require('../service/socketService')
const { logger } = require('../util/logger')

// Constants
const MAX_DRIVER_DISTANCE = 5000 // 5km
const DRIVER_LIMIT = 10
const RIDE_REQUEST_EXPIRY = 60000 // 1 minute

async function findNearbyDrivers(
    pickupCoords,
    vehicleType,
    maxDistance = MAX_DRIVER_DISTANCE
) {
    try {
        // Validate coordinates
        if (!Array.isArray(pickupCoords) || pickupCoords.length !== 2) {
            throw new Error('Invalid pickup coordinates format')
        }

        const [lng, lat] = pickupCoords
        if (
            typeof lng !== 'number' ||
            typeof lat !== 'number' ||
            lng < -180 ||
            lng > 180 ||
            lat < -90 ||
            lat > 90
        ) {
            throw new Error(
                'Coordinates must be valid [longitude, latitude] values'
            )
        }

        logger.debug(
            `Searching for ${vehicleType} drivers within ${maxDistance}m of ${pickupCoords}`
        )

        const aggregationPipeline = [
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: pickupCoords },
                    key: 'location',
                    distanceField: 'distance',
                    maxDistance: maxDistance,
                    spherical: true,
                    query: {
                        status: 'available',
                        isOnline: true,
                        ...(vehicleType && { 'vehicle.type': vehicleType })
                    }
                }
            },
            { $limit: DRIVER_LIMIT },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 1,
                    vehicle: 1,
                    rating: 1,
                    distance: 1,
                    'userDetails.name': 1,
                    'userDetails.profile_image': 1
                }
            }
        ]

        const drivers = await Driver.aggregate(aggregationPipeline).exec()
        logger.debug(`Found ${drivers.length} nearby drivers`)

        return drivers
    } catch (error) {
        logger.error('Error in findNearbyDrivers:', error)
        throw error
    }
}

const MAX_PARALLEL_NOTIFICATIONS = 5 // Limit concurrent notifications

async function notifyDrivers(drivers, ride) {
    try {
        // Input validation
        if (!drivers || !Array.isArray(drivers)) {
            throw new Error('Invalid drivers array')
        }

        if (!ride || !ride._id) {
            throw new Error('Invalid ride object')
        }

        if (drivers.length === 0) {
            logger.warn('No drivers to notify')
            return []
        }

        const expiryTime = new Date(Date.now() + RIDE_REQUEST_EXPIRY)
        const notifications = []
        const failedNotifications = []

        logger.info(
            `Notifying ${drivers.length} drivers about ride ${ride._id}`
        )

        // Process drivers in batches to avoid overloading the system
        const batchSize = Math.min(MAX_PARALLEL_NOTIFICATIONS, drivers.length)

        for (let i = 0; i < drivers.length; i += batchSize) {
            const batch = drivers.slice(i, i + batchSize)

            const batchResults = await Promise.allSettled(
                batch.map((driver) =>
                    processDriverNotification(driver, ride, expiryTime)
                )
            )

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    notifications.push(result.value)
                } else {
                    const driver = batch[index]
                    failedNotifications.push({
                        driverId: driver._id,
                        error: result.reason
                    })
                    logger.error(
                        `Failed to notify driver ${driver._id}:`,
                        result.reason
                    )
                }
            })
        }

        // Log summary
        logger.info(`Notification summary for ride ${ride._id}:`, {
            totalDrivers: drivers.length,
            successful: notifications.length,
            failed: failedNotifications.length,
            failedDriverIds: failedNotifications.map((f) => f.driverId)
        })

        // If all notifications failed, throw an error
        if (notifications.length === 0 && drivers.length > 0) {
            throw new Error('All driver notifications failed')
        }

        return notifications
    } catch (error) {
        logger.error('Error in notifyDrivers:', error)
        throw error
    }
}

async function processDriverNotification(driver, ride, expiryTime) {
    // Validate driver object
    if (!driver || !driver._id) {
        throw new Error('Invalid driver object')
    }

    // Create database notification
    const notification = await Notification.create({
        recipient: driver._id,
        recipientType: 'Driver',
        ride: ride._id,
        type: 'ride_request',
        title: 'New Ride Request',
        message: `New ride available near ${ride.pickup.address}`,
        status: 'sent',
        expiresAt: expiryTime,
        data: {
            rideId: ride._id,
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare?.total,
            distance: driver.distance,
            vehicleType: ride.vehicleType,
            estimatedDuration: ride.estimatedDuration,
            userRating: ride.user?.rating // Include user rating if available
        }
    })

    // Prepare real-time notification payload
    const payload = {
        notificationId: notification._id,
        rideId: ride._id,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare?.total,
        distance: driver.distance,
        expiresAt: expiryTime,
        vehicleType: ride.vehicleType,
        estimatedDuration: ride.estimatedDuration,
        userRating: ride.user?.rating,
        createdAt: new Date()
    }

    // Send real-time notification
    await emitToDriver(driver._id.toString(), 'new_ride_request', payload)

    // Update driver's last notified time (optional)
    await Driver.findByIdAndUpdate(driver._id, {
        $set: { lastNotifiedAt: new Date() }
    })

    return notification
}

module.exports = {
    findNearbyDrivers,
    notifyDrivers
}
