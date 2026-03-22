const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const otpRoutes = require('./routes/otpRoutes');
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const mongoose = require('mongoose');

dotenv.config();

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

// Connect to MongoDB with Production Settings
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
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

// 2. Standard CORS Middleware as backup/secondary
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use('/api/properties', propertyRoutes); // NEW: MongoDB-based search

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
});
