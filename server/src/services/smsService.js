const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && accountSid.startsWith('AC') && authToken && authToken !== 'your_auth_token') {
    client = twilio(accountSid, authToken);
} else {
    console.warn('[SMS] Twilio credentials missing or invalid. OTP will be logged to console instead of sent via SMS.');
}

/**
 * Sends an OTP via SMS using Twilio.
 * @param {string} phoneNumber - The recipient's phone number.
 * @param {string} otp - The one-time password to send.
 * @returns {Promise<void>}
 */
const sendSMS = async (phoneNumber, otp) => {
    try {
        // Ensure phoneNumber is in E.164 format
        // If it's a 10-digit number, assume it's Indian (+91)
        let formattedNumber = phoneNumber.replace(/\s+/g, ''); // Remove spaces
        if (!formattedNumber.startsWith('+')) {
            if (formattedNumber.length === 10) {
                formattedNumber = `+91${formattedNumber}`;
            } else if (formattedNumber.startsWith('91') && formattedNumber.length === 12) {
                formattedNumber = `+${formattedNumber}`;
            }
        }

        if (!client) {
            console.log(`\n--- [MOCK SMS] ---\nTo: ${formattedNumber}\nMessage: Your verification code is: ${otp}. It will expire in 5 minutes.\n------------------\n`);
            return;
        }

        const message = await client.messages.create({
            body: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
            from: fromPhoneNumber,
            to: formattedNumber,
        });
        console.log(`SMS sent to ${formattedNumber}. Message SID: ${message.sid}`);
    } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error);
        throw new Error('Failed to send SMS');
    }
};

module.exports = {
    sendSMS,
};
