const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration - Allow frontend domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://roomrent-ten.vercel.app',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // In production, allow specific origins; in development, allow all
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      // For production, be more permissive to avoid CORS issues
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// Connect to Database
connectDB();

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    res.json({
      status: 'ok',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api', routes);

// Export app for Vercel serverless functions
// For local development, start server manually
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
