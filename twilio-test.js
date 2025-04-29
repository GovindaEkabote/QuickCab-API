require('dotenv-flow').config();
const config = require('./src/config/config');
const twilio = require('twilio');

async function testSendSMS() {
    try {
        const accountSid = config.TWILIO_ACCOUNT_SID;
        const authToken = config.TWILIO_AUTH_TOKEN;
        console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);

        if (!accountSid || !authToken) {
            throw new Error('Missing Twilio credentials');
        }

        console.log('Twilio Config Loaded:', {
            accountSid: '***REDACTED***',
        });

        const client = twilio(accountSid, authToken);

        console.log('Attempting to send test SMS...');
        const message = await client.messages.create({
            body: 'Test SMS from Twilio',
            from: '+15086438142', // Your Twilio number
            to: '+918766701890'   // Recipient number
        });

        console.log('SMS sent successfully!');
        console.log('Message SID:', message.sid);
    } catch (error) {
        if (error.code && error.message) {
            console.error('Twilio API Error:');
            console.error('- Code:', error.code);
            console.error('- Message:', error.message);
            console.error('- More Info:', error.moreInfo);
            console.error('- Status:', error.status);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testSendSMS();
