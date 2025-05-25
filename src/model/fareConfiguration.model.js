const mongoose = require('mongoose')
const Schema = mongoose.Schema

const fareConfigurationSchema = new Schema(
    {
        baseFare: {
            type: Number,
            required: true,
            min: 0
        },
        perKmRate: {
            type: Number,
            required: true,
            min: 0
        },
        perMinuteRate: {
            type: Number,
            required: true,
            min: 0
        },
        fuelSurchargePercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        minFare: {
            type: Number,
            required: true,
            min: 0
        },
        vehicleTypes: [
            {
                type: {
                    type: String,
                    required: true,
                    enum: ['standard', 'xl', 'premium', 'luxury']
                },
                multiplier: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],
        isActive: {
            type: Boolean,
            default: true
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('FareConfiguration', fareConfigurationSchema)
