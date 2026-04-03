const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const cookieParser = require('cookie-parser');
const otpRoutes = require('./routes/otpRoutes');
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const seoRoutes = require('./routes/seoRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zerobroker';

// Allow requests from the frontend with credentials (cookies)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'https://zerobrokerapp.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean).map(url => url.replace(/\/$/, "")); // Strip trailing slashes

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'], // Important for session cookies
  maxAge: 86400, // Cache preflight for 24 hours
};

// Connect to MongoDB with robust error handling
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Do not wait forever for connection
  socketTimeoutMS: 45000,
  autoIndex: true, 
})
  .then(() => console.log('✅ Connected to MongoDB Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // DO NOT process.exit(1) here, so the server can still respond with CORS headers if DB is down
  });

// 1. Manual CORS & Preflight Handling (Highest Priority)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isNetlify = origin && origin.endsWith('netlify.app');
  const isAllowed = !origin || isNetlify || allowedOrigins.includes(origin);

  console.log(`[CORS Check] Method: ${req.method} | Origin: ${origin} | Allowed: ${isAllowed}`);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // Handle preflight immediately
  if (req.method === 'OPTIONS') {
    if (isAllowed) return res.sendStatus(204);
    return res.status(403).send('CORS origin not allowed');
  }
  next();
});

app.use(helmet()); // Secure HTTP headers
app.use(apiLimiter); // Apply global rate limiter

// 2. Standard CORS Middleware as backup/secondary
app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize MongoDB inputs to prevent NoSQL injection
app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
});

app.use(cookieParser()); // Parse incoming HttpOnly cookies

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Global Cache-Control Middleware — prevent stale auth state in mobile/desktop
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/api/otp', otpRoutes);
app.use('/api/auth', authRoutes); // NEW: Secure cookie-based auth
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/seo', seoRoutes);

console.log('[Server] APIs registered: /api/otp, /api/auth, /api/notifications, /api/payments, /api/properties');

// Admin Routes with logging
app.use('/api/admin', (req, res, next) => {
  console.log(`[AdminAPI] ${req.method} ${req.path} - User: ${req.user?.id || 'Unknown'}`);
  next();
}, adminRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
