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

