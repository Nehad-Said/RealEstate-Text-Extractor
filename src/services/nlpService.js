/**
 * nlpService.js
 * Core NLP service — extracts structured property fields from raw Arabic text.
 *
 * Each field extractor returns: { value, confidence }
 *
 * Confidence scale:
 *   1.0  → strong unambiguous match
 *   0.85 → multiple candidates; best one selected
 *   0.75 → partial / inferred match
 *   0.6  → suspicious value (e.g. price looks too small)
 *   0.0  → field not found
 */

const {
  AREA_PATTERN,
  PRICE_PATTERN,
  PROPERTY_TYPE_KEYWORDS,
  PURPOSE_KEYWORDS,
  parseNumber,
  normaliseCurrency,
  normaliseArabic,
} = require('../utils/regexPatterns');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Reset regex lastIndex so patterns can be safely reused across calls */
const resetPattern = (re) => { re.lastIndex = 0; return re; };

/**
 * Scans normalised text against every keyword in a category map.
 * Returns the first matching category and a confidence score.
 *
 * @param {string} normText   - Text already passed through normaliseArabic()
 * @param {object} keywordMap - { categoryName: [keyword, ...], ... }
 * @returns {{ matched: string|null, confidence: number }}
 */
const scanKeywords = (normText, keywordMap) => {
  for (const [category, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (normText.includes(normaliseArabic(kw.toLowerCase()))) {
        return { matched: category, confidence: 1.0 };
      }
    }
  }
  return { matched: null, confidence: 0.0 };
};

// ─── Field extractors ──────────────────────────────────────────────────────────

/**
 * Extracts area in m².
 * Finds all regex matches, filters plausible property sizes (1–99,999 m²),
 * and returns the first (most prominent) value.
 */
const extractArea = (rawText) => {
  resetPattern(AREA_PATTERN);
  const matches = [...rawText.matchAll(AREA_PATTERN)];

  if (!matches.length) return { value: null, confidence: 0.0 };

  const candidates = matches
    .map((m) => parseNumber(m[1]))
    .filter((n) => n !== null && n >= 1 && n <= 99_999);

  if (!candidates.length) return { value: null, confidence: 0.0 };

  return {
    value:      candidates[0],
    confidence: candidates.length === 1 ? 1.0 : 0.85,
  };
};

/**
 * Extracts price and currency.
 * Returns { value, currency, confidence }.
 */
const extractPrice = (rawText) => {
  resetPattern(PRICE_PATTERN);
  const matches = [...rawText.matchAll(PRICE_PATTERN)];

  if (!matches.length) return { value: null, currency: null, confidence: 0.0 };

  const m = matches[0];
  const rawNum      = m[1] ?? m[4]; // Branch A or B
  const rawCurrency = m[2] ?? m[3];

  const value    = parseNumber(rawNum);
  const currency = normaliseCurrency(rawCurrency);

  if (value === null) return { value: null, currency: null, confidence: 0.0 };

  return {
    value,
    currency,
    confidence: value < 100 ? 0.6 : 1.0, // tiny prices are suspicious
  };
};

/**
 * Extracts property type: apartment | villa | land | commercial
 */
const extractPropertyType = (normText) => {
  const { matched, confidence } = scanKeywords(normText, PROPERTY_TYPE_KEYWORDS);
  return { value: matched, confidence };
};

/**
 * Extracts purpose: sale | rent
 */
const extractPurpose = (normText) => {
  const { matched, confidence } = scanKeywords(normText, PURPOSE_KEYWORDS);
  return { value: matched, confidence };
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Main extraction function called by the controller.
 *
 * @param {string} rawText - Original Arabic listing text (un-modified)
 * @returns {object}       - All extracted fields + overall confidence
 */
const extractPropertyFields = (rawText) => {
  // Normalise once; reuse for all keyword-based extractors
  const normText = normaliseArabic(rawText.toLowerCase());

  const area         = extractArea(rawText);          // needs raw text for digit regex
  const price        = extractPrice(rawText);         // needs raw text for digit regex
  const propertyType = extractPropertyType(normText); // keyword scan on normalised text
  const purpose      = extractPurpose(normText);      // keyword scan on normalised text

  // Overall confidence = arithmetic mean of the four field scores
  const scores = [area.confidence, price.confidence, propertyType.confidence, purpose.confidence];
  const overall = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));

  return {
    area_m2: {
      value:      area.value,
      confidence: area.confidence,
    },
    price: {
      value:      price.value,
      currency:   price.currency,
      confidence: price.confidence,
    },
    property_type: {
      value:      propertyType.value,
      confidence: propertyType.confidence,
    },
    purpose: {
      value:      purpose.value,
      confidence: purpose.confidence,
    },
    overall_confidence: overall,
  };
};

module.exports = { extractPropertyFields };

