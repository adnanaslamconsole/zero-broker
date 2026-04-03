const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

let redisUrl = process.env.REDIS_URL;

// Ensure the REDIS_URL starts with 'redis://' if it's pointing to a remote instance
if (redisUrl && !redisUrl.startsWith('redis://') && redisUrl.includes('cloud.redislabs.com')) {
  redisUrl = `redis://${redisUrl}`;
}

const redisConfig = redisUrl 
  ? redisUrl
  : {
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000), // Slower retry to avoid log spam
  };

const redisClient = new Redis(redisConfig);

redisClient.on('error', (err) => {
  if (err.message.includes('NOAUTH')) {
    console.error('❌ Redis Auth Error: Authentication required. Check your REDIS_URL/PASSWORD in .env');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('❌ Redis Connection Error: Local Redis not found. Using in-memory fallback where applicable.');
  } else {
    console.error('Redis Client Error:', err.message);
  }
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

module.exports = redisClient;
