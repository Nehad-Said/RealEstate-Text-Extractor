/**
 * extractController.js
 * Handles HTTP request validation, calls the NLP service,
 * and returns a structured JSON response.
 */

const { extractPropertyFields } = require('../services/nlpService');

// ─── POST /extract-property ────────────────────────────────────────────────────

const extractProperty = (req, res) => {
  try {
    const { text } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "text"',
      });
    }

    if (typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: '"text" must be a string',
      });
    }

    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return res.status(400).json({
        success: false,
        error: '"text" must not be empty',
      });
    }

    if (trimmed.length > 10_000) {
      return res.status(400).json({
        success: false,
        error: '"text" exceeds maximum length of 10,000 characters',
      });
    }

    // ── NLP extraction ────────────────────────────────────────────────────────
    const data = extractPropertyFields(trimmed);

    // ── Success response ──────────────────────────────────────────────────────
    return res.status(200).json({
      success:      true,
      input_length: trimmed.length,
      data,
    });

  } catch (err) {
    console.error('[extractController] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error:   'Internal server error',
    });
  }
};

// ─── GET /health ───────────────────────────────────────────────────────────────

const healthCheck = (_req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'arabic-property-extractor',
    timestamp: new Date().toISOString(),
  });
};

module.exports = { extractProperty, healthCheck };

