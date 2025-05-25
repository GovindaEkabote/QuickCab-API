// pricingService.js
const FareConfiguration = require('../model/fareConfiguration.model')

async function calculateFare({ distance, duration, vehicleType = 'standard' }) {
    // Input validation
    if (isNaN(distance) || distance <= 0) throw new Error('Invalid distance')
    if (isNaN(duration) || duration <= 0) throw new Error('Invalid duration')

    const config = await FareConfiguration.findOne({ isActive: true }).lean()
    if (!config) throw new Error('No active fare configuration')

    // Get vehicle multiplier
    const vehicle = config.vehicleTypes.find((v) => v.type === vehicleType)
    const multiplier = vehicle?.multiplier || 1.0

    // Convert units
    const distanceKm = distance / 1000 // meters to km
    const durationMinutes = duration / 60 // seconds to minutes

    // Calculate components
    const base = config.baseFare * multiplier
    const distanceCost = distanceKm * config.perKmRate * multiplier
    const timeCost = durationMinutes * config.perMinuteRate * multiplier
    const subtotal = base + distanceCost + timeCost
    const fuelSurcharge = subtotal * (config.fuelSurchargePercentage / 100)
    const total = Math.max(config.minFare, subtotal + fuelSurcharge)

    return {
        base: parseFloat(base.toFixed(2)),
        distance: parseFloat(distanceCost.toFixed(2)),
        time: parseFloat(timeCost.toFixed(2)),
        surge: 1, // Default, can be modified later
        total: parseFloat(total.toFixed(2)),
        configurationId: config._id
    }
}

module.exports = { calculateFare }
