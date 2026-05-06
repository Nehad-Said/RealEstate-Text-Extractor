/**
 * app.js
 * Express application entry point.
 * Wires up middleware, mounts the router, and starts the server.
 */

const express = require('express');
const routes  = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));           // parse JSON bodies
app.use(express.urlencoded({ extended: false }));  // parse URL-encoded bodies

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/', routes);

// ─── Global error handler ──────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[app] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('\n  Arabic Property Extractor');
  console.log(`   Health : http://localhost:${PORT}/health`);
  console.log(`   Extract: POST http://localhost:${PORT}/extract-property\n`);
});

module.exports = app;

