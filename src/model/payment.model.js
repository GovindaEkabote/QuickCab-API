const mongoose = require('mongoose')
const Schema = mongoose.Schema

const paymentSchema = new Schema({
    ride: {
        type: mongoose.Schema.ObjectId,
        ref: 'Rider',
        unique: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    method: {
        type: {
            type: String,
            enum: ['cash', 'card', 'wallet', 'upi'],
            required: true
        },
        card: {
            last4: String,
            brand: String,
            country: String
        },
        wallet: {
            provider: String,
            transactionId: String
        },
        upi: {
            vpa: String
        }
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    refunds: [
        {
            amount: Number,
            reason: String,
            status: {
                type: String,
                enum: ['requested', 'processed', 'failed']
            },
            processedAt: Date
        }
    ],
    promoCode: {
        code: String,
        discountApplied: Number,
        originalAmount: Number
    },
    gatewayResponse: Object,
    createdAt: Date
})

module.exports = mongoose.model('Payment', paymentSchema)
