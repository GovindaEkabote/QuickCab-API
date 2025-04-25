const config = require('../config/config');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Otp = require('../model/otp.model');

function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
    }
});

async function createEmailOtp(userId, newEmail) {
    const otp = generateOtp();
    
    await Otp.findOneAndUpdate(
        { userId },
        { 
            otp,
            newEmail,
            type: 'email-update',
            expiresAt: new Date(Date.now() + 600000),
            attempts: 0,
            verified: false
        },
        { upsert: true, new: true }
    );
    
    return otp;
}

const sendSms = async(to, message) => {
    // Use Twilio / Firebase / or console.log for now
    console.log(`Sending SMS to ${to}: ${message}`);
  };

module.exports = {
    generateOtp,
    transporter,
    sendSms,
    createEmailOtp,
};