async function calculateRoute(pickupCoords, destinationCoords) {
    // In a real app, use Google Maps, Mapbox, etc.
    // This is a simplified calculation for demo purposes
    const [lat1, lon1] = pickupCoords
    const [lat2, lon2] = destinationCoords

    // Haversine distance calculation
    const R = 6371e3 // meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const distance = R * c // in meters
    const duration = distance / 8 // assuming 8 m/s average speed (~29 km/h)

    return { distance, duration }
}

module.exports = {
    calculateRoute
}
