// src/service/otp.service.js

const config = require('../config/config');
const { twilioClient, verifyServiceSid } = require('../config/twilio.config');
const Otp = require('../model/otp.model');
const { EApplicationEnvironment } = require('../constant/application');
const responseMessage = require('../constant/responseMessage');

// Generate random 4-digit OTP
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

exports.createOtp = async (phoneNumber, otpType = 'login', userId = null) => {
  try {
    // 1. Generate & store OTP
    const otpCode = generateOtp();
    await Otp.deleteMany({ phoneNumber, otpType });
    const otpRecord = await Otp.create({
      userId,
      phoneNumber,
      otp: otpCode,
      otpType,
      createdAt: new Date(),
    });

    // 2. In Development: log + (optional) send via SMS API
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
      console.log(`OTP for ${phoneNumber}: ${otpCode}`);

      // OPTIONAL: send actual SMS (must be a verified number on trial)
      try {
        await twilioClient.messages.create({
          body: `QuickCab OTP is: ${otpCode} \n Please do not send OTP with anyone.`,
          from: '+15086438142',
          to: phoneNumber,
        });
        console.log(`Sent OTP SMS to ${phoneNumber} via Messages API`);
      } catch (smsError) {
        console.error('Twilio SMS send error (dev):', smsError.message);
      }

    } else {
      // 3. In Production: use Twilio Verify API
      await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ to: phoneNumber, channel: 'sms' });
      console.log(`Sent OTP via Verify Service to ${phoneNumber}`);
    }

    return {
      success: true,
      otp: config.ENV === EApplicationEnvironment.DEVELOPMENT ? otpCode : undefined,
    };

  } catch (error) {
    console.error('OTP creation error:', error);
    return {
      success: false,
      message: responseMessage.OTP_NOT_SENT,
      error: error.message,
    };
  }
};

exports.verifyOtp = async (phoneNumber, otpCode, otpType = 'login') => {
  try {
    // 1. Check DB record
    const otpRecord = await Otp.findOne({ phoneNumber, otp: otpCode, otpType });
    if (!otpRecord) {
      return { success: false, message: responseMessage.INVALID_OTP };
    }

    // 2. Check expiration (5 minutes)
    const ageMinutes = (Date.now() - otpRecord.createdAt) / 1000 / 60;
    if (ageMinutes > 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return { success: false, message: responseMessage.OTP_EXPIRED };
    }

    // 3. In Production: verify with Twilio Verify API
    if (config.ENV !== EApplicationEnvironment.DEVELOPMENT) {
      const check = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({ to: phoneNumber, code: otpCode });

      if (check.status !== 'approved') {
        return { success: false, message: responseMessage.INVALID_OTP };
      }
    }

    // 4. Clean up & return success
    await Otp.deleteOne({ _id: otpRecord._id });
    return { success: true, message: responseMessage.OTP_VERIFIED };

  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      message: responseMessage.OTP_VERIFICATION_FAILED,
      error: error.message,
    };
  }
};
