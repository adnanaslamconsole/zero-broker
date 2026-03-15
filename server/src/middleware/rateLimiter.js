const redisClient = require('../services/redisClient');

/**
 * Rate limiter middleware using Redis.
 * Limits OTP requests per phone number.
 * Defaults: 3 requests per 10 minutes.
 */
const otpRateLimiter = async (req, res, next) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const key = `ratelimit:sendotp:${phoneNumber}`;
    const LIMIT = 3;
    const WINDOW_SECONDS = 600; // 10 minutes

    try {
        const requests = await redisClient.incr(key);

        if (requests === 1) {
            await redisClient.expire(key, WINDOW_SECONDS);
        }

        if (requests > LIMIT) {
            return res.status(429).json({
                error: 'Too many OTP requests. Please try again after 10 minutes.',
            });
        }

        next();
    } catch (error) {
        console.error('Rate Limiter Error:', error);
        next(); // Fail open but log error
    }
};

module.exports = {
    otpRateLimiter,
};
