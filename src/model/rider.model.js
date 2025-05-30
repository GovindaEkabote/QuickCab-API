const mongoose = require('mongoose')
const Schema = mongoose.Schema

const riderSchema = new Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    driver: {
        type: mongoose.Schema.ObjectId,
        ref: 'Driver'
        // required: true
    },
    pickup: {
        address: String,
        coordinates: [Number], // [lng, lat],
        contactPhone: String
    },
    destination: {
        address: String,
        coordinates: [Number] // [lng, lat],
    },
    route: {
        type: { type: String, default: 'LineString' },
        coordinates: [[Number]] // Polyline
    },
    expiresAt: {
        type: Date
    },
    status: {
        type: String,
        enum: [
            'requested',
            'accepted',
            'arrived',
            'in_progress',
            'completed',
            'cancelled'
        ],
        default: 'requested'
    },
    fare: {
        base: { type: Number, required: true },
        distance: { type: Number, required: true },
        time: { type: Number, required: true },
        surge: { type: Number, default: 1, min: 1 },
        total: { type: Number, required: true }
    },
    estimatedDistance: Number, // meters
    estimatedDuration: Number, // seconds
    payment: {
        type: mongoose.Schema.ObjectId,
        ref: 'Payment'
    },
    timeline: {
        requestedAt: Date,
        acceptedAt: Date,
        arrivedAt: Date,
        startedAt: Date,
        completedAt: Date
    },
    createdAt: Date
})

module.exports = mongoose.model('Ride', riderSchema)
