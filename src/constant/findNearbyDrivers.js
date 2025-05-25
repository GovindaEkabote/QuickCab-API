const Driver = require('../model/driver.model')
const notificationModel = require('../model/notification.model')
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

async function notifyDrivers(drivers, ride) {
    try {
        if (!drivers || !Array.isArray(drivers)) {
            throw new Error('Invalid drivers array')
        }
        if (!ride || !ride._id) {
            throw new Error('Invalid ride object')
        }

        const notifications = []
        const expiryTime = new Date(Date.now() + RIDE_REQUEST_EXPIRY)

        logger.info(
            `Notifying ${drivers.length} drivers about ride ${ride._id}`
        )

        for (const driver of drivers) {
            try {
                const notification = await notificationModel.create({
                    recipient: driver._id,
                    ride: ride._id,
                    type: 'ride_request',
                    status: 'sent',
                    expiresAt: expiryTime,
                    data: {
                        rideId: ride._id,
                        pickup: ride.pickup,
                        destination: ride.destination,
                        fare: ride.fare?.total,
                        distance: driver.distance,
                        vehicleType: ride.vehicleType
                    }
                })

                await emitToDriver(driver._id, 'new_ride_request', {
                    rideId: ride._id,
                    pickup: ride.pickup,
                    destination: ride.destination,
                    fare: ride.fare?.total,
                    distance: driver.distance,
                    expiresAt: expiryTime,
                    vehicleType: ride.vehicleType
                })

                notifications.push(notification)
            } catch (notificationError) {
                logger.error(
                    `Failed to notify driver ${driver._id}:`,
                    notificationError
                )
                // Continue with other drivers
            }
        }

        return notifications
    } catch (error) {
        logger.error('Error in notifyDrivers:', error)
        throw error
    }
}

module.exports = {
    findNearbyDrivers,
    notifyDrivers
}
