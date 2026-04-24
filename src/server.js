/**
 * Express Server Entry Point
 * 
 * Serves the REST API at /bfhl and static frontend from /public.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const bfhlRouter = require('./routes/bfhl');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/bfhl', bfhlRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server explicitly on 0.0.0.0 for platforms like Render
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  console.log(`📡 API endpoint: POST http://0.0.0.0:${PORT}/bfhl`);
});

// Catch any unhandled errors instead of crashing immediately
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
