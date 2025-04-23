/* eslint-disable no-unused-vars */
const User = require('../model/user.model');
const Otp = require('../model/otp.model');
const { asyncHandler } = require('../util/asyncHandler');
const httpResponse = require('../util/httpResponse');
const responseMessage = require('../constant/responseMessage');
const httpError = require('../util/httpError');
const {
    generateOtp,
    transporter,
    pendingEmailUpdates,
    createEmailOtp
} = require('../service/otp.Email.js');

// Maximum allowed OTP attempts
const MAX_OTP_ATTEMPTS = 3;

// Initiate email update with OTP
exports.updateEmail = asyncHandler(async (req, res, next) => {
    const { newEmail } = req.body;
    const userId = req.user.id;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return httpResponse(req, res, 400, responseMessage.INVALID_EMAIL_FORMAT);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return httpResponse(req, res, 400, responseMessage.EMAIL_EXIST);
    }

    // Generate OTP
    const otp = await createEmailOtp(userId,newEmail);

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
        });
    } catch (error) {
        return httpResponse(req, res, 500, responseMessage.EMAIL_SEND_FAILED);
    }

    return httpResponse(req, res, 201, responseMessage.OTP_SENT);
});

// Verify OTP and complete email update
exports.verifyOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const userId = req.user.id;

    // Find the OTP record
    const otpRecord = await Otp.findOne({ userId,type: 'email-update' });

    if (otpRecord?.blockedUntil && otpRecord.blockedUntil > new Date()) {
        const hoursLeft = Math.ceil((otpRecord.blockedUntil - new Date()) / (1000 * 60 * 60));
        return httpResponse(req, res, 429, `Too many attempts. Try again after ${hoursLeft} hours.`);
    }

    // Check if OTP is already verified
    if (otpRecord.verified) {
        return httpResponse(req, res, 400, responseMessage.OTP_ALREADY_VERIFIED);
    }

    // Check if OTP expired
    if (Date.now() > otpRecord.expiresAt) {
        await Otp.deleteOne({ userId });
        return httpResponse(req, res, 400, responseMessage.OTP_EXPIRED);
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        otpRecord.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await otpRecord.save();
        return httpResponse(req, res, 429, responseMessage.TOO_MANY_ATTEMPTS);
    }

    // Verify OTP
    if (otp !== otpRecord.otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        return httpResponse(req, res, 400, responseMessage.INVALID_OTP);
    }

    // Mark as verified and update email
    try {
        await User.findByIdAndUpdate(userId, { 
            email: otpRecord.newEmail,
            emailVerified: true 
        });

        otpRecord.verified = true;
        await otpRecord.save();

        return httpResponse(req, res, 200, responseMessage.EMAIL_UPDATED);
    } catch (error) {
        console.error('Email update error:', error);
        return httpResponse(req, res, 500, responseMessage.UPDATE_FAILED);
    }
    
});

// Optional: Resend OTP endpoint
exports.resendOTP = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Check if user is blocked
    const existingOtp = await Otp.findOne({ userId, type: 'email-update' });
    if (existingOtp?.blockedUntil && existingOtp.blockedUntil > new Date()) {
        const hoursLeft = Math.ceil((existingOtp.blockedUntil - new Date()) / (1000 * 60 * 60));
        return httpResponse(req, res, 429, `Too many attempts. Try again after ${hoursLeft} hours.`);
    }
    
    // Delete existing OTP if not blocked
    await Otp.deleteOne({ userId, type: 'email-update' });
    
    // Call updateEmail again
    return exports.updateEmail(req, res);
});