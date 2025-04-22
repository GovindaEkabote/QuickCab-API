/* eslint-disable no-unused-vars */
const User = require('../model/user.model')
const Otp = require('../model/otp.model')
const { asyncHandler } = require('../util/asyncHandler')
const httpResponse = require('../util/httpResponse')
const responseMessage = require('../constant/responseMessage')
const { createOtp, verifyOtp } = require('../service/otp.service')
const config = require('../config/config')
const { EApplicationEnvironment } = require('../constant/application')
const httpError = require('../util/httpError')
const createHttpError = require('http-errors')
const path = require('path')
const fs = require('fs').promises
const { generateTokens } = require('../service/generateTokens')

// user Register..
exports.registerUser = asyncHandler(async (req, res, next) => {
    const { fullName, email, phoneNumber, password, role = 'user' } = req.body;

    // Validate required fields
    const requiredFields = { fullName, email, phoneNumber, password };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingFields.length > 0) {
        return httpResponse(
            req,
            res,
            400,
            `Missing required fields: ${missingFields.join(', ')}`
        );
    }

    // Validate role
    const validRoles = ['user', 'driver', 'admin'];
    if (role && !validRoles.includes(role)) {
        return httpResponse(
            req,
            res,
            400,
            `Invalid role. Must be one of: ${validRoles.join(', ')}`
        );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return httpResponse(req, res, 400, 'Invalid email format');
    }

    // Validate phone number format (basic international format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    if (!phoneRegex.test(phoneNumber)) {
        return httpResponse(
            req,
            res,
            400,
            'Invalid phone number format. Please include country code'
        );
    }

    // Check if user already exists
    try {
        const existingUser = await User.findOne({
            $or: [{ email }, { phoneNumber }]
        });

        if (existingUser) {
            const conflictField = existingUser.email === email 
                ? 'email' 
                : 'phoneNumber';
            return httpResponse(
                req,
                res,
                409,
                `User with this ${conflictField} already exists`
            );
        }

        // Create user with hashed password
        const user = await User.create({
            fullName,
            email: email.toLowerCase(), // normalize email
            phoneNumber,
            password, // Ensure your User model hashes this automatically
            role,
            isVerified: false
        });

        // Generate and send OTP
        const otpResult = await createOtp(phoneNumber, 'verify');
        if (!otpResult.success) {
            // Rollback user creation if OTP fails
            await User.deleteOne({ _id: user._id });
            return httpResponse(
                req,
                res,
                500,
                'Failed to send OTP. Please try again.',
                { error: otpResult.message }
            );
        }

        // Return response without sensitive data
        const userData = {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role
        };

        return httpResponse(
            req,
            res,
            201,
            'OTP sent to your phone number. Please verify to complete registration.',
            {
                user: userData,
                phoneNumber,
                // Only include OTP in development for testing
                ...(config.ENV === EApplicationEnvironment.DEVELOPMENT && {
                    demoOtp: otpResult.otp
                })
            }
        );

    } catch (error) {
        console.error('Registration error:', error);
        return httpResponse(
            req,
            res,
            500,
            'An error occurred during registration',
            config.ENV === EApplicationEnvironment.DEVELOPMENT 
                ? { error: error.message } 
                : undefined
        );
    }
});

// Modified verifyRegistrationOtp function..
exports.verifyRegistrationOtp = asyncHandler(async (req, res, next) => {
    const { phoneNumber, otp } = req.body

    if (!phoneNumber || !otp) {
        return httpResponse(req, res, 400, 'Phone number and OTP are required')
    }

    // Use OTP service
    const verification = await verifyOtp(phoneNumber, otp, 'verify')
    if (!verification.success) {
        return httpResponse(req, res, 400, verification.message)
    }

    // Rest of the function remains the same...
    const user = await User.findOne({ phoneNumber })
    if (!user) {
        return httpResponse(req, res, 404, 'User not found')
    }

    user.isVerified = true

    const { accessToken, referenceToken } = await generateTokens(user)
    user.referenceToken = referenceToken;
    await user.save()

    res.cookie('access_token', accessToken, responseMessage.cookieOptions)
    res.cookie('refresh_token', referenceToken, responseMessage.cookieOptions)

    const userData = await User.findById(user._id)
        .select('-password -refreshToken')
        .lean()

    return httpResponse(req, res, 200, 'Registration successful', {
        user: userData,
        accessToken,
        referenceToken
    })
})

// Login with phone number (send OTP if no referenceToken)
exports.loginWithPhone = asyncHandler(async (req, res, next) => {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
        return httpResponse(req, res, 400, 'Phone number is required')
    }

    // Check if user exists
    const user = await User.findOne({ phoneNumber })
    if (!user) {
        return httpResponse(
            req,
            res,
            404,
            'User not found. Please register first.'
        )
    }

    // If user has a reference token, skip OTP and login directly
    if (user.referenceToken && user.referenceToken !== '-') {
        const { accessToken, referenceToken } = await generateTokens(user)

        user.referenceToken = referenceToken
        await user.save()

        res.cookie('access_token', accessToken, responseMessage.cookieOptions)
        res.cookie(
            'refresh_token',
            referenceToken,
            responseMessage.cookieOptions
        )

        const userData = await User.findById(user._id)
            .select('-password -referenceToken')
            .lean()

        return httpResponse(req, res, 200, 'Login successful', {
            user: userData,
            accessToken,
            referenceToken
        })
    }

    // If no valid referenceToken, send OTP using OTP service
    const otpResult = await createOtp(phoneNumber, 'login')
    if (!otpResult.success) {
        return httpResponse(req, res, 500, otpResult.message)
    }

    return httpResponse(req, res, 200, 'OTP sent to your phone number', {
        phoneNumber,
        ...(config.ENV === EApplicationEnvironment.DEVELOPMENT && {
            demoOtp: otpResult.otp
        })
    })
})

// Verify login OTP
exports.verifyLoginOtp = asyncHandler(async (req, res, next) => {
    const { phoneNumber, otp } = req.body

    if (!phoneNumber || !otp) {
        return httpResponse(req, res, 400, 'Phone number and OTP are required')
    }

    // Use OTP service to verify
    const verification = await verifyOtp(phoneNumber, otp, 'login')
    if (!verification.success) {
        return httpResponse(req, res, 400, verification.message)
    }

    // Find the user
    const user = await User.findOne({ phoneNumber })
    if (!user) {
        return httpResponse(req, res, 404, 'User not found')
    }

    // Generate tokens
    const { accessToken, referenceToken } = await generateTokens(user)

    // Save referenceToken
    user.referenceToken = referenceToken
    await user.save()

    res.cookie('access_token', accessToken, responseMessage.cookieOptions)
    res.cookie('refresh_token', referenceToken, responseMessage.cookieOptions)

    const userData = await User.findById(user._id)
        .select('-password -referenceToken')
        .lean()

    return httpResponse(req, res, 200, 'OTP verified successfully', {
        user: userData,
        accessToken,
        referenceToken
    })
})

// upload Profile Image..
exports.uploadProfileImage = asyncHandler(async (req, res, next) => {
    try {
        if (!req.file) {
            throw createHttpError(400, 'No image file provided')
        }

        const userId = req.user._id // Get from authenticated user
        const { filename } = req.file

        // Construct URLs
        const baseUrl =
            config.ENV === EApplicationEnvironment.PRODUCTION
                ? `https://${req.hostname}`
                : `http://${req.hostname}:${config.PORT}`

        const publicUrl = `${baseUrl}/uploads/profile-images/${filename}`
        const localPath = path.join(
            'public',
            'uploads',
            'profile-images',
            filename
        )

        // Update user document
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    profile_image: {
                        url: publicUrl,
                        public_id: filename,
                        mimeType: req.file.mimetype,
                        size: req.file.size
                    },
                    local_profileImagePath: localPath
                }
            },
            { new: true, select: '-password -referenceToken' }
        )

        // Delete old image if exists
        if (req.user.profile_image?.local_profileImagePath) {
            try {
                await fs.unlink(
                    path.join(
                        __dirname,
                        '..',
                        req.user.profile_image.local_profileImagePath
                    )
                )
            } catch (err) {
                console.error('Error deleting old profile image:', err)
            }
        }

        return httpResponse(
            req,
            res,
            200,
            responseMessage.profileImageUploadedSuccessfully,
            { user: updatedUser }
        )
    } catch (error) {
        next(error)
    }
})

// delete Profile Image..
exports.deleteProfileImage = asyncHandler(async (req, res, next) => {
    const userId = req.user._id

    // Check if profile image or public_id exists
    if (!req.user.profile_image || !req.user.profile_image.public_id) {
        return httpResponse(req, res, 400, responseMessage.PROFILE_NOT_FOUND)
    }

    // Safe deletion of the profile image from the filesystem
    const filePath = path.join(
        __dirname,
        '..',
        'public',
        'uploads',
        'profile-images',
        req.user.profile_image.public_id
    )

    await fs.unlink(filePath) // This might fail and throw an error

    // Update user document to remove profile image
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                profile_image: 1,
                local_profileImagePath: 1
            }
        },
        { new: true, select: '-password -referenceToken' }
    )

    // Return success response with the updated user
    return httpResponse(req, res, 200, responseMessage.PROFILE, {
        user: updatedUser
    })
})

// PUT:/api/v1/update-profile..
exports.updateUserProfile = asyncHandler(async (req, res, next) => {
    const { fullName, email, phoneNumber } = req.body
    const userId = req.user._id;
    const updateUserProfile = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                fullName: fullName,
                email: email,
                phoneNumber: phoneNumber
            }
        },
        { new: true }
    ).select('-password -referenceToken')
    return httpResponse(
        req,
        res,
        200,
        'User profile updated ',
        updateUserProfile 
    )
})

// GET:/api/v1/user-profile
exports.getUserById = asyncHandler(async(req,res,next) =>{
    const {userId} = req.params;
    const user = await User.findById(userId).select("-password -referenceToken");
    if(!user){
        return httpResponse(req, res, 404, responseMessage.userNotFound)
    }
    return httpResponse(
        req,
        res,
        200,
        responseMessage.userFetchedSuccessfully,
        user,

    )
})

// logout
exports.logoutUser = asyncHandler(async(req,res,next) =>{
    const userId = req.user?._id;
    await User.findByIdAndUpdate(userId,{
        $unset:{referenceToken:''}
    });
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.ENV === EApplicationEnvironment.PRODUCTION,
        sameSite: 'Strict',
        path: '/'
    });

    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.ENV === EApplicationEnvironment.PRODUCTION,
        sameSite: 'Strict',
        path: '/'
    });
    return httpResponse(req, res, 200, responseMessage.LOGOUT);
})

// SocialAuth 
exports.socialLoginCallback = asyncHandler(async (req, res) => {
    const user = req.user;
    
    // Generate tokens
    const { accessToken, referenceToken } = generateTokens(user);
    
    // Update reference token
    user.referenceToken = referenceToken;
    await user.save();

    // Set cookies if needed
    res.cookie('referenceToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Return response
    return res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            },
            accessToken,
            referenceToken
        },
        message: "Login successful"
    });
});

// controller/auth.controller.js
exports.checkLoginStatus = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user) {
      return res.status(200).json({
        isLoggedIn: true,
        user: {
          id: user._id,
          name: user.fullName,
          email: user.email
        }
      });
    } else {
      return res.status(401).json({ isLoggedIn: false });
    }
  });

exports.deleteProfile = asyncHandler(async(req,res) =>{
    const userId = req.user.id;
    const user = await User. findByIdAndUpdate(
        userId,
        {isDeleted:true},
        {new:true}
    );
    if(!user){
        return httpResponse(req,res,404,'User not found' )
    }
    return httpResponse(req,res,200,responseMessage.DeleteProfile)
})
  

// /api/v1/auth/social/apple
// /api/v1/auth/refresh	



// PUT:/api/v1/change-password
// PUT:/api/v1/change-password
