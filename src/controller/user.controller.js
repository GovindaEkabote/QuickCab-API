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

// Maximum allowed OTP attempts
const MAX_OTP_ATTEMPTS = 3

// Initiate email update with OTP
exports.updateEmail = asyncHandler(async (req, res, next) => {
    const { newEmail } = req.body
    const userId = req.user.id

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return httpResponse(req, res, 400, responseMessage.INVALID_EMAIL_FORMAT)
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail })
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return httpResponse(req, res, 400, responseMessage.EMAIL_EXIST)
    }

    // Generate OTP
    const otp = await createEmailOtp(userId, newEmail)

    // Send email
    try {
        await transporter.sendMail({
            from: '"QuickCab" <no-reply@quickcab.com>',
            to: newEmail,
            subject: 'Verify Your New Email Address',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Email Verification</h2>
                    <p>Your verification code is:</p>
                    <h1 style="background: #f0f0f0; display: inline-block; padding: 10px 20px; border-radius: 5px;">
                        ${otp}
                    </h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p style="color: #666; font-size: 12px;">
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            `
        })
    } catch (error) {
        return httpResponse(req, res, 500, responseMessage.EMAIL_SEND_FAILED)
    }

    return httpResponse(req, res, 201, responseMessage.OTP_SENT)
})

// Verify OTP and complete email update
exports.verifyOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body
    const userId = req.user.id

    // Find the OTP record
    const otpRecord = await Otp.findOne({ userId, type: 'email-update' })

    if (otpRecord?.blockedUntil && otpRecord.blockedUntil > new Date()) {
        const hoursLeft = Math.ceil(
            (otpRecord.blockedUntil - new Date()) / (1000 * 60 * 60)
        )
        return httpResponse(
            req,
            res,
            429,
            `Too many attempts. Try again after ${hoursLeft} hours.`
        )
    }

    // Check if OTP is already verified
    if (otpRecord.verified) {
        return httpResponse(req, res, 400, responseMessage.OTP_ALREADY_VERIFIED)
    }

    // Check if OTP expired
    if (Date.now() > otpRecord.expiresAt) {
        await Otp.deleteOne({ userId })
        return httpResponse(req, res, 400, responseMessage.OTP_EXPIRED)
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        otpRecord.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        await otpRecord.save()
        return httpResponse(req, res, 429, responseMessage.TOO_MANY_ATTEMPTS)
    }

    // Verify OTP
    if (otp !== otpRecord.otp) {
        otpRecord.attempts += 1
        await otpRecord.save()
        return httpResponse(req, res, 400, responseMessage.INVALID_OTP)
    }

    // Mark as verified and update email
    try {
        await User.findByIdAndUpdate(userId, {
            email: otpRecord.newEmail,
            emailVerified: true
        })

        otpRecord.verified = true
        await otpRecord.save()

        return httpResponse(req, res, 200, responseMessage.EMAIL_UPDATED)
    } catch (error) {
        console.error('Email update error:', error)
        return httpResponse(req, res, 500, responseMessage.UPDATE_FAILED)
    }
})

// Optional: Resend OTP endpoint
exports.resendOTP = asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Check if user is blocked
    const existingOtp = await Otp.findOne({ userId, type: 'email-update' })
    if (existingOtp?.blockedUntil && existingOtp.blockedUntil > new Date()) {
        const hoursLeft = Math.ceil(
            (existingOtp.blockedUntil - new Date()) / (1000 * 60 * 60)
        )
        return httpResponse(
            req,
            res,
            429,
            `Too many attempts. Try again after ${hoursLeft} hours.`
        )
    }

    // Delete existing OTP if not blocked
    await Otp.deleteOne({ userId, type: 'email-update' })

    // Call updateEmail again
    return exports.updateEmail(req, res)
})

// send OTP to change Mobile number..
exports.sendPhoneUpdateOtp = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body
    if (!phoneNumber) {
        return httpResponse(req, res, 400, 'Phone number is required')
    }

    const phoneExists = await User.findOne({
        phone: phoneNumber,
        _id: { $ne: req.user._id }
    })
    if (phoneExists) {
        return httpResponse(
            req,
            res,
            400,
            'Phone number already in use by another account'
        )
    }
    const otpToday = await Otp.countDocuments({
        userId: req.user.id,
        type: 'phone-update',
        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    if (otpToday >= 5) {
        return httpResponse(
            req,
            res,
            429,
            'Maximum OTP limit reached. Please try again tomorrow.'
        )
    }

    // Check for recent OTP requests to prevent spam
    const recentOtp = await Otp.findOne({
        userId: req.user._id,
        type: 'phone-update',
        createdAt: { $gt: new Date(Date.now() - 1 * 60 * 1000) } // 1 minutes
    })

    if (recentOtp) {
        return httpResponse(
            req,
            res,
            429,
            'Please wait before requesting another OTP'
        )
    }

    const otpCode = generateOtp()
    const otpEntry = new Otp({
        userId: req.user._id,
        phoneNumber,
        otp: otpCode,
        type: 'phone-update',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes expiry
    })

    try {
        await otpEntry.save()
        await sendSms(
            phoneNumber,
            `Your OTP for phone number update is: ${otpCode}`
        )
        return httpResponse(req, res, 200, 'OTP sent to new phone number')
    } catch (error) {
        console.error('OTP sending failed:', error)
        return httpResponse(req, res, 500, 'Failed to send OTP')
    }
})

// verify OTP and update Phone Number..
exports.verifyPhoneOtpAndUpdate = asyncHandler(async (req, res) => {
    const { phoneNumber, otp } = req.body

    if (!phoneNumber || !otp) {
        return httpResponse(req, res, 400, 'Phone number and OTP are required')
    }

    const phoneExists = await User.findOne({
        phone: phoneNumber,
        _id: { $ne: req.user._id }
    })
    if (phoneExists) {
        return httpResponse(
            req,
            res,
            400,
            'Phone number already in use by another account'
        )
    }

    const existingOtp = await Otp.findOne({
        userId: req.user._id,
        phoneNumber,
        otp,
        type: 'phone-update',
        verified: false,
        expiresAt: { $gt: new Date() }
    })

    if (!existingOtp) {
        await Otp.updateMany(
            { userId: req.user._id, phoneNumber, type: 'phone-update' },
            { $inc: { attempts: 1 } }
        )
        return httpResponse(req, res, 400, 'Invalid or expired OTP')
    }

    try {
        // Mark OTP as used
        existingOtp.verified = true
        await existingOtp.save()

        // Invalidate any other OTPs for this operation
        const updatedUser = await User.findOneAndUpdate(
            req.user._id,
            { phoneNumber: phoneNumber },
            { new: true } // Returns the updated document
        )
        if (!updatedUser) {
            return httpResponse(req, res, 404, 'User not found')
        }

        await Otp.updateMany(
            {
                userId: req.user._id,
                type: 'phone-update',
                verified: false
            },
            { $set: { expiresAt: new Date() } } // Expire immediately
        )

        return httpResponse(
            req,
            res,
            200,
            'Phone number updated successfully',
            {
                phoneNumber: updatedUser.phone
            }
        )
    } catch (error) {
        console.error('Phone update failed:', error)
        return httpResponse(req, res, 500, 'Failed to update phone number')
    }
})

// delete account..
exports.deleteUserAccount = asyncHandler(async (req, res) => {
    const userId = req.user._id

    const user = await User.findById(userId)
    if (!user) {
        return httpResponse(req, res, 404, 'User not found')
    }
    if (user.status === 'deleted') {
        return httpResponse(req, res, 400, 'Your account is already deleted.')
    }

    // 1. Check for active rides
    const activeRide = await Ride.find({
        user: userId,
        status: { $in: ['requested', 'accepted', 'arrived', 'in_progress'] }
    })
    if (activeRide.length > 0) {
        return httpResponse(
            res,
            req,
            400,
            'Cannot delete account - you have active rides'
        )
    }

    // 2. Check for pending payments
    const pendingPayment = await Payment.find({
        user: userId,
        status: 'pending'
    })
    if (pendingPayment.length > 0) {
        return httpResponse(
            res,
            req,
            400,
            'Cannot delete account - you have pending payments'
        )
    }

    // 3. Generate unique deleted email instead of null
    const timestamp = Date.now()
    const deletedEmail = `deleted-${userId}-${timestamp}@deleted.com`
    const deletedPhone = `deleted-${userId}-${timestamp}`

    // 4. Anonymize user (Soft Delete)
    const deletedUser = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                fullName: 'Deleted User',
                email: deletedEmail,
                phoneNumber: deletedPhone,
                password: '',
                status: 'deleted',
                referenceToken: null, // Explicitly set to null
                'socialAuth.googleId': null,
                'socialAuth.facebookId': null,
                'socialAuth.appleId': null
            },
            $unset: {
                profile_image: 1
                // If referenceToken still persists, try unsetting it
                // referenceToken: 1
            }
        },
        { new: true }
    )

    // If referenceToken still exists after update, try this alternative approach
    if (deletedUser.referenceToken) {
        await User.updateOne({ _id: userId }, { $unset: { referenceToken: 1 } })
    }
    res.clearCookie('access_token') // Clear the access token cookie
    res.clearCookie('refresh_token') // Clear the refresh token cookie

    return httpResponse(req, res, 200, 'Account deleted successfully', {
        data: {
            userId: deletedUser._id,
            deletedAt: deletedUser.updatedAt
        }
    })
})

// Admin Login..
exports.updateRole = asyncHandler(async (req, res) => {
    const { fullName, email, phoneNumber, role } = req.body

    if (!constant.allowedRoles.includes(role)) {
        return httpResponse(req, res, 400, 'Invalid role value')
    }
    const filter = { fullName, email }
    if (phoneNumber) {
        filter.phoneNumber = phoneNumber
    }
    const user = await User.findOneAndUpdate(filter, { role }, { new: true })
    if (!user) {
        return httpResponse(
            req,
            res,
            404,
            'User not found with provided details'
        )
    }
    return httpResponse(req, res, 200, 'User role updated successfully', {
        userId: user._id,
        newRole: user.role
    })
})

// Suspend Driver..
exports.suspendDriver = asyncHandler(async (req, res) => {
    const { email, reason } = req.body
    const user = await User.findOne({ email })
    if (!user) {
        return httpResponse(req, res, 404, 'Driver Not Found')
    }
    if (user.role !== 'driver') {
        return httpResponse(req, res, 400, 'User is not driver')
    }
    if (user.status === constant.USER_STATUS.SUSPENDED) {
        return httpResponse(req, res, 400, 'Driver is already suspended')
    }
    user.status = constant.USER_STATUS.SUSPENDED
    user.suspensionDetails = {
        reason,
        suspendedAt: new Date(),
        canReactivateAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
    await user.save()

    return httpResponse(req, res, 200, 'Driver suspended successfully', {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        suspensionDetails: user.suspensionDetails
    })
})

// Get All Suspended Drivers..
exports.getSuspendedDriver = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const suspendedDriver = await User.find({
        role: 'driver',
        status: 'suspended'
    })
        .skip(skip)
        .limit(limit)
        .select('-password')

    const total = await User.countDocuments({
        role: 'driver',
        status: 'suspended'
    })
    return httpResponse(
        req,
        res,
        200,
        'Suspended drivers fetched successfully',
        {
            drivers: suspendedDriver,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    )
})

// get suspended driver by its id..
exports.getSuspendedDriverById = asyncHandler(async (req, res) => {
    const { id } = req.params

    const driver = await User.findOne({
        _id: id,
        role: 'driver',
        status: 'suspended'
    }).select('-password')

    if (!driver) {
        return httpResponse(req, res, 404, 'Suspended driver not found')
    }
    return httpResponse(
        req,
        res,
        200,
        'Suspended driver details fetched',
        driver
    )
})

// activateDrivers..
exports.getActiveDrivers = asyncHandler(async (req, res) => {
    const driver = await User.findOne({
        _id: req.params.id,
        role: 'driver',
        status: 'suspend'
    })
    if (!driver) {
        return httpResponse(req, res, 404, 'Driver not found or not suspended')
    }
})
// Admin Routes for Future
/*
1. PUT /users/me/password - Change password
2.POST /auth/forgot-password - Initiate reset

POST /auth/reset-password - Complete reset

POST /auth/verify-email - Send verification

POST /auth/verify-phone - SMS verification
*/
