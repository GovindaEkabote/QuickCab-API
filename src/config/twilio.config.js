const twilio = require('twilio')
const config = require('./config')

const accountSid = config.TWILIO_ACCOUNT_SID
const authToken = config.TWILIO_AUTH_TOKEN
const verifyServiceSid = config.TWILIO_VERIFY_SERVICE_SID

const twilioClient = twilio(accountSid, authToken)

module.exports = {
    twilioClient,
    verifyServiceSid
}
