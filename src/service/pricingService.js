const FareConfiguration = require('../model/fareConfiguration.model')
const httpResponse = require('../util/httpResponse')

async function calculateFare(distance, duration, vehicleType = 'standard') {
    // Get current fare configuration
    const config = await FareConfiguration.findOne({ isActive: true })
    if (!config) {
        return httpResponse(req, res, 400, 'No active fare configuration found')
    }
    // Find vehicle type multiplier
    const vehicleConfig = config.vehicleTypes.find(
        (vt) => vt.type === vehicleType
    )
    const vehicleMultiplier = vehicleConfig ? vehicleConfig.multiplier : 1.0

    // Calculate fare components
    const base = config.baseFare * vehicleMultiplier
    const distanceFare =
        (distance / 1000) * config.perKmRate * vehicleMultiplier // Convert meters to km
    const timeFare = (duration / 60) * config.perMinuteRate * vehicleMultiplier // Convert seconds to minutes

    // Calculate fuel surcharge
    const fuelSurcharge =
        (base + distanceFare + timeFare) *
        (config.fuelSurchargePercentage / 100)

    const subtotal = base + distanceFare + timeFare + fuelSurcharge
    const total = Math.max(config.minFare, Math.round(subtotal * 100) / 100) // Ensure minimum fare

    return {
        base,
        distance: distanceFare,
        time: timeFare,
        fuelSurcharge,
        vehicleMultiplier,
        total,
        configurationId: config._id
    }
}

module.exports = {
    calculateFare
}
