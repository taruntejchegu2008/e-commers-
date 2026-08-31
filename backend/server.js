const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// --- Global middleware ---
// Enable CORS so the frontend can call the API from a different origin
app.use(cors());
// Parse incoming JSON request bodies
app.use(express.json());

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
