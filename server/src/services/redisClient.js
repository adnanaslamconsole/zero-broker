const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

// Using ioredis instead of the basic 'redis' package keeps compatibility with your existing codebase,
// while correctly connecting to your remote Redis Cloud instance using the provided credentials.
const redisClient = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  });

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis Cloud successfully');
});

module.exports = redisClient;
