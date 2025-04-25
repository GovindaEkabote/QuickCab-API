const config = require('../config/config')
const Otp = require('../model/otp.model')
const { EApplicationEnvironment } = require('../constant/application')
const responseMessage = require('../constant/responseMessage')

// Generate random 4-digit OTP
const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
}

exports.createOtp = async (phoneNumber, otpType = 'login') => {
    try {
        console.log(`Creating OTP for ${phoneNumber}, type: ${otpType}`); // Add this
        await Otp.deleteMany({ phoneNumber, otpType });
        const otpCode =
            config.ENV === EApplicationEnvironment.DEVELOPMENT
                ? '1234'
                : generateOtp();

        const otp = await Otp.create({
            phoneNumber,
            otp: otpCode,
            otpType,
            createdAt: new Date()
        });

        console.log(`Created OTP record:`, otp); // Add this

        if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
            console.log(
                `OTP for ${phoneNumber}: ${otpCode} (Expires in 5 minutes)`
            );
        }
        return {
            success: true,
            otp: otpCode
        };
    } catch (error) {
        console.error('Error creating OTP:', error);
        return {
            success: false,
            message: responseMessage.OTP_NOT_SENT
        };
    }
};

exports.verifyOtp = async (phoneNumber, otpCode, otpType) => {
    try {
        console.log(`Verifying OTP for ${phoneNumber}, code: ${otpCode}, type: ${otpType}`); // Add this
        const otpRecord = await Otp.findOne({
            phoneNumber,
            otp: otpCode,
            otpType
        });
        
        console.log('Found OTP record:', otpRecord); // Add this
        
        if (!otpRecord) {
            return {
                success: false,
                message: responseMessage.INVALID_OTP
            };
        }
        
        const now = new Date();
        const otpExpire = (now - otpRecord.createdAt) / 1000 / 60;
        console.log(`OTP age: ${otpExpire} minutes`); // Add this
        
        if (otpExpire > 5) {
            await Otp.deleteOne({ _id: otpRecord._id });
            return {
                success: false,
                message: responseMessage.OTP_EXPIRED
            };
        }
        
        await Otp.deleteOne({ _id: otpRecord._id });
        return {
            success: true,
            message: responseMessage.OTP_VERIFIED
        };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return {
            success: false,
            message: responseMessage.OTP_VERIFICATION_FAILED
        };
    }
};


