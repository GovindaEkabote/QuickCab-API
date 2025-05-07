/* eslint-disable no-unused-vars */
const User = require('../model/user.model')
const Payment = require('../model/payment.model.js')
const Ride = require('../model/rider.model.js')
const Otp = require('../model/otp.model')
const { asyncHandler } = require('../util/asyncHandler')
const httpResponse = require('../util/httpResponse')
const responseMessage = require('../constant/responseMessage')
const constant = require('../constant/constant.js')
const httpError = require('../util/httpError')
const {
    generateOtp,
    transporter,
    pendingEmailUpdates,
    createEmailOtp,
    sendSms
} = require('../service/otp.Email.js')
const mongoose = require('mongoose')
const { slackNotifier } = require('../service/slackNotifier')


const MAX_DRIVER_DISTANCE = 5000  // 5KM
const DRIVER_RESPONSE_TIMEOUT = 60000;  // 60 seconds to accept

exports.requestRide = asyncHandler(async(req,res) =>{
    const {
        pickup,
        destination,
        contactPhone,
        estimatedDistance, // in meters
        estimatedDuration // in seconds
    } = req.body;

    if(!pickup || !destination||!contactPhone || !estimatedDistance || !estimatedDuration){
        return httpResponse(req,res,400,'Missing required fields')
    }

    if(!pickup.coordinates || pickup.coordinates.length !== 2){
        return httpResponse(req,res,400,'Invalid Pick coordinates')
    }
    if(!destination.coordinates || destination.coordinates.length !== 2){
        return httpResponse(req,res,400,'Invalid Destination coordinates')
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
