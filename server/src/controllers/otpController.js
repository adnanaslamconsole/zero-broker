const otpService = require('../services/otpService');
const smsService = require('../services/smsService');

/**
 * Controller for sending OTP.
 */
const sendOTP = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        const otp = otpService.generateOTP();
        await otpService.storeOTP(phoneNumber, otp);
        await smsService.sendSMS(phoneNumber, otp);

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

/**
 * Controller for verifying OTP.
 */
const verifyOTP = async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS, 10) || 3;

    if (!phoneNumber || !otp) {
        return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    try {
        const attempts = await otpService.incrementAttempts(phoneNumber);

        if (attempts > MAX_ATTEMPTS) {
            await otpService.clearOTP(phoneNumber);
            return res.status(403).json({ error: 'Maximum attempts exceeded. Please request a new OTP.' });
        }

        const isValid = await otpService.verifyOTP(phoneNumber, otp);

        if (isValid) {
            await otpService.clearOTP(phoneNumber);
            return res.status(200).json({ message: 'OTP verified successfully', verified: true });
        }

        res.status(400).json({
            error: 'Invalid OTP',
            attemptsRemaining: MAX_ATTEMPTS - attempts
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        if (error.message === 'OTP expired or not found') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error during verification' });
    }
};

module.exports = {
    sendOTP,
    verifyOTP,
};
