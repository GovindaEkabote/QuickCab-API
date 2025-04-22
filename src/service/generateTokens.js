const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
        },
        config.JWT_ACCESS_SECRET_KEY,
        { expiresIn: config.ACCESS_TOKEN_EXPIRY }
    );
};

const generateReferenceToken = (user) => {
    return jwt.sign(
        {
            _id: user._id
        },
        config.JWT_REFRESH_SECRET_KEY,
        { expiresIn: config.REFRESH_TOKEN_EXPIRY }
    );
};

// ✅ Utility to generate both tokens at once
const generateTokens = (user) => {
    const accessToken = generateAccessToken(user);
    const referenceToken = generateReferenceToken(user);
    return { accessToken, referenceToken };
};

module.exports = {
    generateAccessToken,
    generateReferenceToken,
    generateTokens
};
