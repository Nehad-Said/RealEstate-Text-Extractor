/**
 * routes.js
 * Registers all application routes on an Express Router.
 */

const { Router } = require('express');
const { extractProperty, healthCheck } = require('./controllers/extractController');

const router = Router();

// Health check
router.get('/health', healthCheck);

// Arabic property field extraction
router.post('/extract-property', extractProperty);

// 404 catch-all for unregistered paths
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error:   'Route not found',
    hint:    'Available routes: GET /health  |  POST /extract-property',
  });
});

module.exports = router;

