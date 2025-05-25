const notificationModel = require('../model/notification.model')
const { emitToDriver } = require('../service/socketService')

const DRIVER_RESPONSE_TIMEOUT = 60000 // 60 seconds to accept

async function notifyDrivers(drivers, ride) {
    const notifications = []
    const expiryTime = new Date(Date.now() + DRIVER_RESPONSE_TIMEOUT)

    for (const driver of drivers) {
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
                fare: ride.fare.total
            }
        })

        emitToDriver(driver._id, 'new_ride_request', {
            rideId: ride._id,
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare.total,
            expiresAt: expiryTime
        })

        notifications.push(notification)
    }

    return notifications
}

module.exports = {
    notifyDrivers
}
