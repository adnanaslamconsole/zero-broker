const bcrypt = require('bcrypt');
const redisClient = require('./redisClient');
const crypto = require('crypto');

const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300; // 5 minutes
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

/**
 * Generates a random 6-digit OTP.
 * @returns {string} 6-digit OTP string.
 */
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hashes OTP and stores it in Redis with the phone number as key.
 * Also resets the attempt counter.
 * @param {string} phoneNumber 
 * @param {string} otp 
 */
const storeOTP = async (phoneNumber, otp) => {
    const hashedOTP = await bcrypt.hash(otp, SALT_ROUNDS);
    const key = `otp:${phoneNumber}`;
    const attemptKey = `attempts:${phoneNumber}`;

    // Store hashed OTP with expiration
    await redisClient.set(key, hashedOTP, 'EX', OTP_EXPIRY);
    // Reset attempts
    await redisClient.set(attemptKey, 0, 'EX', OTP_EXPIRY);
};

/**
 * Checks if the provided OTP matches the stored hashed OTP.
 * @param {string} phoneNumber 
 * @param {string} otp 
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (phoneNumber, otp) => {
    const key = `otp:${phoneNumber}`;
    const storedHashedOTP = await redisClient.get(key);

    if (!storedHashedOTP) {
        throw new Error('OTP expired or not found');
    }

    const isValid = await bcrypt.compare(otp, storedHashedOTP);
    return isValid;
};

/**
 * Increments and returns the attempt count for a phone number.
 * @param {string} phoneNumber 
 * @returns {Promise<number>}
 */
const incrementAttempts = async (phoneNumber) => {
    const attemptKey = `attempts:${phoneNumber}`;
    return await redisClient.incr(attemptKey);
};

/**
 * Deletes the OTP and attempt counter from Redis (e.g., after successful verification).
 * @param {string} phoneNumber 
 */
const clearOTP = async (phoneNumber) => {
    const key = `otp:${phoneNumber}`;
    const attemptKey = `attempts:${phoneNumber}`;
    await redisClient.del(key, attemptKey);
};

module.exports = {
    generateOTP,
    storeOTP,
    verifyOTP,
    incrementAttempts,
    clearOTP,
};
