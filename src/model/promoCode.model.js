const mongoose = require('mongoose')
const Schema = mongoose.Schema

const promoCodeSchema = new Schema({
    code: {
        type: String,
        unique: true,
        uppercase: true // e.g  "URKFAN"
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed', 'free_ride'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    minFare: Number, // Minimum ride amount to apply
    maxDiscount: Number, // Cap for percentage discounts
    validFrom: Date,
    validUntil: Date,
    useLimit: {
        type: Number,
        default: 1 // 1-time use by default
    },
    usedCount: {
        type: Number,
        default: 0
    },
    userSpecific: [
        {
            userId: mongoose.Schema.ObjectId, // Optional: Limit to specific users
            ref: 'User'
        }
    ],
    vehicleType: [
        {
            type: String,
            enum: ['bike', 'car', 'premium']
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: Date
})

module.exports = mongoose.model('PromoCode', promoCodeSchema)
