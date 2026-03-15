const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Sends an OTP via SMS using Twilio.
 * @param {string} phoneNumber - The recipient's phone number.
 * @param {string} otp - The one-time password to send.
 * @returns {Promise<void>}
 */
const sendSMS = async (phoneNumber, otp) => {
    try {
        const message = await client.messages.create({
            body: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
            from: fromPhoneNumber,
            to: phoneNumber,
        });
        console.log(`SMS sent to ${phoneNumber}. Message SID: ${message.sid}`);
    } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error);
        throw new Error('Failed to send SMS');
    }
};

module.exports = {
    sendSMS,
};
