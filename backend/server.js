const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

// ============================================================
// Fail-fast environment validation (never run with a weak or
// missing JWT secret). This keeps the secret OUT of source code
// and prevents accidentally booting production with a placeholder.
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (JWT_SECRET.length < 48) {
  console.error(
    'FATAL: JWT_SECRET is too short (< 48 chars). Generate a strong random secret, e.g.:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n' +
      'and set it in backend/.env. Refusing to start.'
  );
  process.exit(1);
}
if (/^(your_super_secret|change_me|example|secret)/i.test(JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET looks like a placeholder. Set a real secret in backend/.env.');
  process.exit(1);
}

const app = express();

// Trust the first proxy hop. Required so rate limiting (and
// req.ip) sees the real client IP when deployed behind a reverse
// proxy (Render/Vercel/nginx). Do NOT enable blindly on a local box
// without a proxy; set it only where a trusted proxy sits in front.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ============================================================
// Helmet: set secure HTTP headers (CSP, X-Frame-Options,
// nosniff, HSTS, etc.). Disable CSP in dev if you inline scripts.
// ============================================================
app.use(helmet());

// Parse incoming JSON request bodies (before sanitization)
app.use(express.json());

// ============================================================
// NoSQL injection protection: strip any '$' operators and dotted
// keys from req.body, req.query, and req.params. Prevents payloads
// like {"email":{"$ne":""}} from becoming Mongo query operators.
// ============================================================
app.use(mongoSanitize());

// ============================================================
// CORS: allow ONLY the configured origins (never '*' for requests
// that carry credentials/JWTs). Add your deployed frontend URL to
// CLIENT_ORIGINS (comma-separated) in .env.
// ============================================================
const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  // Local development fallback (loopback only). Lock this down to
  // explicit origins in production via CLIENT_ORIGINS.
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000');
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin and non-browser (curl/tests) requests
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ============================================================
// Rate limiting (brute-force protection)
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // max requests per IP per window for the whole API
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max login/register attempts per IP per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // don't count successful logins, only failures
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Apply the strict auth limiter BEFORE mounting auth routes
app.use('/api/auth', authLimiter);
// Apply the general API limiter
app.use('/api', globalLimiter);

// --- Mount API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// --- 404 handler for unknown API routes (returns JSON, not the SPA) ---
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// --- Serve frontend static files (optional convenience for local dev) ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// --- Centralized error-handling middleware (must have 4 args) ---
// Catches any error thrown in routes and returns a consistent JSON shape
app.use((err, req, res, next) => {
  // CORS errors come through here with a message about origin
  if (err && /not allowed by cors/i.test(err.message || '')) {
    return res.status(403).json({ message: 'Not allowed by CORS' });
  }

  // Map Mongoose validation/cast errors to client-friendly 400s
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Duplicate key error (e.g. unique email)
    statusCode = 400;
    message = 'Duplicate value entered, already exists';
  }

  res.status(statusCode).json({ message });
});

// --- Connect to MongoDB and start server ---
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
