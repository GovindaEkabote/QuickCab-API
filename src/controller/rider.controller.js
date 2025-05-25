const { calculateFare } = require('../service/pricingService.js')
const { asyncHandler } = require('../util/asyncHandler')
const {
    findNearbyDrivers,
    notifyDrivers
} = require('../constant/findNearbyDrivers.js')
const httpResponse = require('../util/httpResponse')
const {
    setDriverResponseTimeout
} = require('../constant/setDriverResponseTimeout.js')
const { calculateRoute } = require('../constant/calculateRoute.js')
const { emitToDriver, emitToUser } = require('../service/socketService')
const Ride = require('../model/rider.model.js')
const Driver = require('../model/driver.model.js')

exports.requestRide = asyncHandler(async (req, res) => {
    const {
        pickup,
        destination,
        contactPhone = req.user.phoneNumber,
        vehicleType = 'standard'
    } = req.body

    // Enhanced validation with coordinate order checking
    const validateCoordinates = (coords, name) => {
        if (!Array.isArray(coords) || coords.length !== 2) {
            throw new Error(
                `${name} coordinates must be an array of two numbers`
            )
        }

        const [lng, lat] = coords
        if (typeof lng !== 'number' || typeof lat !== 'number') {
            throw new Error(`${name} coordinates must contain numbers`)
        }

        // Check if values might be swapped (common mistake)
        if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
            console.warn(`Potential coordinate order issue in ${name}:`, coords)
            throw new Error(
                `${name} coordinates must be in [longitude, latitude] order`
            )
        }

        return coords
    }

    try {
        // Validate inputs
        if (
            !pickup ||
            !destination ||
            typeof pickup !== 'object' ||
            typeof destination !== 'object'
        ) {
            throw new Error('Pickup and destination objects required')
        }

        const pickupCoords = validateCoordinates(pickup.coordinates, 'pickup')
        const destinationCoords = validateCoordinates(
            destination.coordinates,
            'destination'
        )

        if (
            pickupCoords[0] === destinationCoords[0] &&
            pickupCoords[1] === destinationCoords[1]
        ) {
            throw new Error('Pickup and destination cannot be identical')
        }

        const validVehicleTypes = ['standard', 'xl', 'premium', 'luxury']
        if (!validVehicleTypes.includes(vehicleType)) {
            throw new Error(
                `Invalid vehicle type. Must be one of: ${validVehicleTypes.join(', ')}`
            )
        }

        // Calculate route
        const { distance: estimatedDistance, duration: estimatedDuration } =
            await calculateRoute(pickupCoords, destinationCoords)

        if (
            isNaN(estimatedDistance) ||
            isNaN(estimatedDuration) ||
            estimatedDistance <= 0 ||
            estimatedDuration <= 0
        ) {
            throw new Error('Invalid route calculation')
        }

        // Find nearby drivers
        const nearbyDrivers = await findNearbyDrivers(pickupCoords, vehicleType)

        if (!nearbyDrivers || nearbyDrivers.length === 0) {
            // Debug why no drivers are found
            const availableDrivers = await Driver.countDocuments({
                status: 'available',
                isOnline: true,
                'vehicle.type': vehicleType
            })

            console.log('Driver availability debug:', {
                totalAvailable: availableDrivers,
                searchLocation: pickupCoords,
                vehicleType
            })

            throw new Error('No available drivers found nearby')
        }

        // Calculate fare with fallback
        let fare
        try {
            fare = await calculateFare({
                distance: estimatedDistance,
                duration: estimatedDuration,
                vehicleType
            })

            if (!fare || typeof fare.total !== 'number' || fare.total <= 0) {
                throw new Error('Invalid fare calculation')
            }
        } catch (fareError) {
            console.error('Fare calculation error:', fareError)
            // Fallback fare values
            fare = {
                base: 50,
                distance: (estimatedDistance / 1000) * 10, // 10/km
                time: (estimatedDuration / 60) * 1, // 1/minute
                surge: 1,
                total: Math.max(
                    100,
                    (estimatedDistance / 1000) * 10 +
                        (estimatedDuration / 60) * 1 +
                        50
                ),
                configurationId: null
            }
        }

        // Create ride
        const ride = await Ride.create({
            user: req.user._id,
            driver: null, // Will be set when driver accepts
            pickup: {
                address: pickup.address || 'Address not specified',
                coordinates: pickupCoords,
                contactPhone
            },
            destination: {
                address: destination.address || 'Address not specified',
                coordinates: destinationCoords
            },
            route: {
                type: 'LineString',
                coordinates: [pickupCoords, destinationCoords]
            },
            estimatedDistance,
            estimatedDuration,
            fare,
            status: 'requested',
            timeline: {
                requestedAt: new Date()
            },
            vehicleType
        })

        // Notify drivers
        try {
            await notifyDrivers(nearbyDrivers, ride)
            console.log(`Notified ${nearbyDrivers.length} drivers`)
        } catch (notificationError) {
            console.error('Driver notification error:', notificationError)
            // Continue even if some notifications fail
        }

        // Set timeout for driver response
        setDriverResponseTimeout(ride._id)

        // Prepare response data
        const responseData = {
            ride: {
                _id: ride._id,
                status: ride.status,
                estimatedFare: fare.total,
                pickup: ride.pickup,
                destination: ride.destination,
                vehicleType: ride.vehicleType,
                estimatedArrivalTime: new Date(
                    Date.now() + estimatedDuration * 1000
                ),
                nearbyDrivers: nearbyDrivers.length,
                drivers: nearbyDrivers.map((driver) => ({
                    id: driver._id,
                    name: driver.userDetails?.name || 'Driver',
                    phone: driver.userDetails?.phoneNumber || 'Not available',
                    vehicle: {
                        type: driver.vehicle?.type || 'standard',
                        make: driver.vehicle?.make || 'Unknown',
                        model: driver.vehicle?.model || 'Unknown',
                        year: driver.vehicle?.year || null,
                        color: driver.vehicle?.color || 'Unknown',
                        plateNumber: driver.vehicle?.plateNumber || 'Unknown'
                    },
                    distance: `${Math.round(driver.distance)} meters`,
                    rating: driver.rating || 5.0,
                    profileImage: driver.userDetails?.profile_image || null
                })),
                expiresAt: new Date(Date.now() + 60000) // 1 minute expiry
            }
        }

        return httpResponse(
            req,
            res,
            201,
            'Ride requested successfully',
            responseData
        )
    } catch (error) {
        console.error('Ride request failed:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            user: req.user?._id
        })

        const statusCode =
            error.name === 'ValidationError'
                ? 400
                : error.message.includes('No available')
                  ? 404
                  : 500

        return httpResponse(req, res, statusCode, error.message)
    }
})

/*
1. Ride Service (Core Ride Management)
Handles ride requests, status updates, and ride lifecycle.

API Endpoints
Method	Endpoint	Description
    POST /rider/register  -- Register Rider with 
    POST /rides/request	Create a new ride request (with pickup, destination, fare estimate)
    GET	 /rides/{rideId}	Fetch ride details (status, driver info, route)
    PUT	 /rides/{rideId}/cancel	Cancel a ride (with cancellation reason)
    PUT	 /rides/{rideId}/accept	Driver accepts the ride (Driver Service calls this)
    PUT	 /rides/{rideId}/arrived	Driver notifies arrival at pickup
    PUT	 /rides/{rideId}/start	Ride starts (Odometer starts)
    PUT	 /rides/{rideId}/complete	Ride ends (Triggers payment)
    GET	 /rides/users/{userId}/history	Get user's ride history (with filters)
    GET	 /rides/users/{userId}/active	Check if user has an active ride
    POST /rides/{rideId}/update-route	Recalculate route (if rider changes destination)

🔹 Events Produced:
RideRequested
RideAccepted
RideCancelled
RideCompleted
-----------------------------------------------------------------
2. Pricing & Estimation Service
Calculates fares, surge pricing, and ETA.

API Endpoints
Method	Endpoint	Description
    POST	/pricing/estimate	Get fare estimate (distance, time, surge)
    GET	/pricing/surge	Check surge multiplier in a zone
    POST	/pricing/apply-promo	Validate & apply promo code

🔹 Events Consumed:
LocationChanged (for dynamic pricing)
-----------------------------------------------------------------
3. Driver Matching & Dispatch Service
Finds and assigns the best driver.

API Endpoints
Method	Endpoint	Description
    POST	/dispatch/request	Find nearby drivers (called by Ride Service)
    POST	/dispatch/assign	Assign a driver to a ride
    PUT	/dispatch/{rideId}/reassign	Reassign ride (if driver cancels)
    GET	/dispatch/drivers/nearby	List available drivers in a zone
🔹 Events Produced:
DriverAssigned
DriverUnavailable
-----------------------------------------------------------------
4. Real-Time Location Service (WebSocket API)
Tracks driver/rider locations in real-time.

API Endpoints
Method	Endpoint	Description
    WS	/tracking/updates	Subscribe to ride location updates
    POST	/tracking/update-location	Push location updates (from driver/rider app)
🔹 Events Produced:
LocationUpdated
-----------------------------------------------------------------
5. Payment Service
Handles payments, refunds, and invoices.

API Endpoints
Method	Endpoint	Description
    POST	/payments/charge	Charge rider after ride completion
    POST	/payments/refund	Process refunds (if ride cancelled)
    GET	/payments/{rideId}/invoice	Generate ride invoice
    POST	/payments/setup-intent	Setup payment method (Stripe/PayPal)
🔹 Events Consumed:
RideCompleted (triggers payment)
-----------------------------------------------------------------
6. Notification Service (Pub/Sub)
Sends push/SMS/email notifications.

API Endpoints
Method	Endpoint	Description
    POST	/notifications/send	Send a notification (called by other services)
🔹 Events Consumed:
RideRequested → Notify nearby drivers
RideAccepted → Notify rider
RideCompleted → Send receipt
-----------------------------------------------------------------
7. Analytics & Reporting Service
Generates insights on rides, revenue, and driver performance.

API Endpoints
Method	Endpoint	Description
    GET	/analytics/rides	Ride metrics (daily/weekly/monthly)
    GET	/analytics/drivers/{driverId}	Driver performance stats
    GET	/analytics/revenue	Revenue breakdown
-----------------------------------------------------------------
8. User & Driver Profile Service
Manages user/driver profiles and preferences.

API Endpoints
Method	Endpoint	Description
GET	/users/{userId}	Fetch user profile
PUT	/users/{userId}/preferences	Update ride preferences
GET	/drivers/{driverId}	Fetch driver details
-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------

*/
