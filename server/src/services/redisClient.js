const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

module.exports = redisClient;
