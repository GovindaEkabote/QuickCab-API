const mongoose = require('mongoose')
const Schema = mongoose.Schema

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'recipientType'
        },
        recipientType: {
            type: String,
            required: true,
            enum: ['Rider', 'Driver']
        },
        ride: {
            type: Schema.Types.ObjectId,
            ref: 'Ride'
        },
        type: {
            type: String,
            required: true,
            enum: [
                'ride_request',
                'ride_accepted',
                'ride_cancelled',
                'driver_arrived',
                'payment_receipt'
            ]
        },
        status: {
            type: String,
            required: true,
            enum: ['sent', 'delivered', 'read', 'expired', 'failed'],
            default: 'sent'
        },
        title: String,
        message: String,
        data: Schema.Types.Mixed, // Additional payload data
        expiresAt: Date,
        readAt: Date
    },
    { timestamps: true }
)

// Indexes for faster queries
notificationSchema.index({ recipient: 1, status: 1 })
notificationSchema.index({ ride: 1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('Notification', notificationSchema)
