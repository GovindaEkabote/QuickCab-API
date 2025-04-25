const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    phoneNumber: {
        type: String,
        // required: true
    },
    newEmail: {
        type: String,
        
    },
    otp: {
        type: String,
        required: true
    },
    otpType: {
        type: String,
        enum: ['login', 'verify', 'reset'],
        default: 'login'
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 600000) // 10 minutes from now
    },
    type: {
        type: String,
        enum: ['email-update', 'phone-verification', 'password-reset','phone-update'],
        default: 'email-update'
    },
    attempts: {
        type: Number,
        default: 0
    },
    verified: {
        type: Boolean,
        default: false
    },
    blockedUntil: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5 minutes
    }
},{timestamps:true})
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });
module.exports = mongoose.model('Otp', otpSchema)
