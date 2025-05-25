const notificationModel = require('../model/notification.model')
const riderModel = require('../model/rider.model')
const { emitToUser } = require('../service/socketService')
const DRIVER_RESPONSE_TIMEOUT = 60000 // 60 seconds to accept

function setDriverResponseTimeout(rideId) {
    setTimeout(async () => {
        const ride = await riderModel.findById(rideId)

        if (ride && ride.status === 'requested') {
            ride.status = 'cancelled'
            ride.cancellationReason = 'No driver accepted'
            await ride.save()

            emitToUser(ride.user, 'ride_cancelled', {
                rideId: ride._id,
                reason: 'No driver accepted your request'
            })

            await notificationModel.updateMany(
                { ride: rideId, status: 'sent' },
                { status: 'expired' }
            )
        }
    }, DRIVER_RESPONSE_TIMEOUT)
}

module.exports = {
    setDriverResponseTimeout
}
