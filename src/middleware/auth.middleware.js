const jwt = require('jsonwebtoken');
const User = require('../model/user.model')
const { asyncHandler } = require('../util/asyncHandler');
const httpError = require('../util/httpError');

const verifyToken = (token, secretKey) => {
    try {
        return jwt.verify(token, secretKey);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

// Middleware to check access token
exports.verifyAccessToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies.access_token;
    if (!token) {
        return httpError(res, 'Access token is missing', 401);
    }

    const decoded = verifyToken(token, process.env.JWT_ACCESS_SECRET_KEY);

    // ✅ Fetch full user info from DB
    const user = await User.findById(decoded._id).select('-password -referenceToken');
    if (!user) {
        return httpError(res, 'User not found', 404);
    }

    req.user = user;
    next();
});

// Middleware to check refresh token
exports.verifyRefreshToken = asyncHandler((req, res, next) => {
    const token = req.cookies.refresh_token;
    if (!token) {
        return httpError(res, 'Refresh token is missing', 401);
    }

    req.user = verifyToken(token, process.env.JWT_REFRESH_SECRET_KEY);
    next();
});
