const FuelPrice = require('../model/fuelPrice.model')
const FareConfiguration = require('../model/fareConfiguration.model')
const { asyncHandler } = require('../util/asyncHandler')
const responseMessage = require('../constant/responseMessage')
const httpResponse = require('../util/httpResponse')

exports.updateFulePrice = asyncHandler(async (req, res) => {
    const { fuelType, pricePerLiter } = req.body;
    const userId = req.user.id
    await FuelPrice.updateMany(
        { fuelType, isActive: true },
        { isActive: false }
    )

    // create new Fule price record..
    const newFuelPrice = await FuelPrice.create({
        fuelType,
        pricePerLiter,
        updatedBy: userId
    })
    await updateFareConfigurationsWithFuelSurcharge() // Recalculate all fares based on new fuel price

    return httpResponse(req, res, 200, 'Fuel price updated successfully', {
        newFuelPrice
    })
})

exports.updateFareConfiguration = asyncHandler(async (req, res) => {
    const {
        baseFare,
        perKmRate,
        perMinuteRate,
        fuelSurchargePercentage,
        minFare,
        vehicleTypes
    } = req.body

    await FareConfiguration.updateMany({ isActive: true }, { isActive: false })

    // Create new configuration
    const newConfig = await FareConfiguration.create({
        baseFare,
        perKmRate,
        perMinuteRate,
        fuelSurchargePercentage,
        minFare,
        vehicleTypes,
        updatedBy: req.user._id
    })
    return httpResponse(req, res, 200, 'Fare configuration updated successfully', {
        newConfig
    })
})



// Helper function to update fare configurations with fuel surcharge
async function updateFareConfigurationsWithFuelSurcharge() {
    const activeFuelPrices = await FuelPrice.find({ isActive: true });
    const avgFuelPrice = calculateAverageFuelPrice(activeFuelPrices);
    
    // Get current active fare configuration
    const currentConfig = await FareConfiguration.findOne({ isActive: true });
    
    if (currentConfig) {
      // Calculate new fuel surcharge percentage based on fuel price change
      // This is a simplified calculation - adjust based on your business logic
      const baseFuelPrice = 80; // Your baseline fuel price
      const priceChange = avgFuelPrice - baseFuelPrice;
      const newSurcharge = Math.min(Math.max(0, (priceChange / baseFuelPrice) * 100), 20); // Cap at 20%
      
      // Update the configuration
      currentConfig.fuelSurchargePercentage = newSurcharge;
      await currentConfig.save();
    }
  }
  
  function calculateAverageFuelPrice(fuelPrices) {
    if (fuelPrices.length === 0) return 0;
    const sum = fuelPrices.reduce((acc, curr) => acc + curr.pricePerLiter, 0);
    return sum / fuelPrices.length;
  }
