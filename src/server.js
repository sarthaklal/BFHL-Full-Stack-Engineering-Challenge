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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoint: POST http://localhost:${PORT}/bfhl`);
});

module.exports = app;
