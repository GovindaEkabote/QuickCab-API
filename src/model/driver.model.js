const mongoose = require('mongoose')
const Schema = mongoose.Schema

const driverSchema = new Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true
        },
        phoneNumber: {
            type: String,
            required: true // Enforce phone number
        },
        license: {
            number: String,
            expiry: Date,
            verified: Boolean
        },
        vehicle: {
            type: {
                // e.g., "Sedan", "SUV", "Motorcycle"
                type: String,
                trim: true
            },
            make: {
                // e.g., "Toyota", "Honda"
                type: String,
                trim: true
            },
            model: {
                // e.g., "Camry", "Civic"
                type: String,
                trim: true
            },
            year: {
                // Manufacturing year
                type: Number,
                min: 1900,
                max: new Date().getFullYear() + 1
            },
            color: {
                type: String,
                trim: true
            },
            plateNumber: {
                type: String,
                uppercase: true,
                trim: true
            }
        },
        location: {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point'],
                required: true
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
                validate: {
                    validator: function (coords) {
                        return (
                            coords.length === 2 &&
                            typeof coords[0] === 'number' &&
                            typeof coords[1] === 'number'
                        )
                    },
                    message:
                        'Coordinates must be an array of two numbers [longitude, latitude]'
                }
            }
        },
        status: {
            type: String,
            enum: ['offline', 'available', 'in_ride', 'busy'],
            default: 'offline'
        },
        rating: {
            average: {
                type: Number,
                min: 1,
                max: 5,
                default: 5
            },
            count: {
                type: Number,
                default: 0
            }
        },
        document: [
            {
                type: {
                    type: String,
                    enum: ['license', 'rc', 'insurance']
                },
                url: String,
                verified: Boolean
            }
        ],
        isOnline: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

// Only create one 2dsphere index
driverSchema.index({
    location: '2dsphere',
    status: 1,
    isOnline: 1,
    'vehicle.type': 1
})

module.exports = mongoose.model('Driver', driverSchema)
