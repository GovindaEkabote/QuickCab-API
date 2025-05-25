const mongoose = require('mongoose')
const Schema = mongoose.Schema

const fuelPriceSchema = new Schema(
    {
        fuelType: {
            type: String,
            required: true,
            enum: ['petrol', 'diesel', 'cng', 'electric'],
            default: 'petrol'
        },
        pricePerLiter: {
            type: Number,
            required: true,
            min: 0
        },
        effectiveDate: {
            type: Date,
            default: Date.now
        },
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

// Index for active fuel prices
fuelPriceSchema.index({ fuelType: 1, isActive: 1 })

module.exports = mongoose.model('FuelPrice', fuelPriceSchema)
