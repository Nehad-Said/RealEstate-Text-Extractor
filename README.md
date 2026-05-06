# Arabic Property Extractor API

A Node.js REST API that parses Arabic real-estate listing text and returns structured JSON — no ML model or external NLP library needed.

---

## Quick Start

```bash
# 1. Clone / download the project
cd property-extractor

# 2. Start everything with one command
docker-compose up
```

API is live at `http://localhost:3000`.

---

## Project Structure

```
property-extractor/
│
├── src/
│   ├── controllers/
│   │   └── extractController.js   # HTTP validation & response formatting
│   ├── services/
│   │   └── nlpService.js          # Core extraction logic
│   ├── utils/
│   │   └── regexPatterns.js       # Regex patterns & Arabic keyword maps
│   ├── app.js                     # Express server entry point
│   └── routes.js                  # Route definitions
│
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## API Reference

### `POST /extract-property`

**Request**
```json
{ "text": "<Arabic property listing text>" }
```

**Response 200**
```json
{
  "success": true,
  "input_length": 42,
  "data": {
    "area_m2":            { "value": 120,        "confidence": 1.0 },
    "price":              { "value": 500000, "currency": "EGP", "confidence": 1.0 },
    "property_type":      { "value": "apartment", "confidence": 1.0 },
    "purpose":            { "value": "sale",      "confidence": 1.0 },
    "overall_confidence": 1.0
  }
}
```

- `property_type` values: `apartment` | `villa` | `land` | `commercial`
- `purpose` values: `sale` | `rent`
- `currency` values: `EGP` | `USD` | `SAR` | `AED` | `KWD`
- Undetected fields: `"value": null, "confidence": 0.0`

**Response 400** — missing or invalid `text` field  
**Response 500** — unexpected server error

---

### `GET /health`
```json
{ "status": "ok", "service": "arabic-property-extractor", "timestamp": "..." }
```

---

## Sample Requests

### 1 — Apartment for sale
```bash
curl -X POST http://localhost:3000/extract-property \
  -H "Content-Type: application/json" \
  -d '{"text": "شقة للبيع 120 متر بسعر 500000 جنيه مصري"}'
```
```json
{
  "success": true,
  "data": {
    "area_m2":            { "value": 120,    "confidence": 1.0 },
    "price":              { "value": 500000, "currency": "EGP", "confidence": 1.0 },
    "property_type":      { "value": "apartment", "confidence": 1.0 },
    "purpose":            { "value": "sale",      "confidence": 1.0 },
    "overall_confidence": 1.0
  }
}
```

### 2 — Villa for rent (Arabic-Indic digits)
```bash
curl -X POST http://localhost:3000/extract-property \
  -H "Content-Type: application/json" \
  -d '{"text": "فيلا للإيجار مساحة ٣٠٠م٢ الإيجار ١٢٠٠ دولار شهريا"}'
```
```json
{
  "success": true,
  "data": {
    "area_m2":            { "value": 300,  "confidence": 1.0 },
    "price":              { "value": 1200, "currency": "USD", "confidence": 1.0 },
    "property_type":      { "value": "villa", "confidence": 1.0 },
    "purpose":            { "value": "rent",  "confidence": 1.0 },
    "overall_confidence": 1.0
  }
}
```

### 3 — Partial match (purpose missing)
```bash
curl -X POST http://localhost:3000/extract-property \
  -H "Content-Type: application/json" \
  -d '{"text": "أرض 500 م2 بسعر 200000 جنيه"}'
```
```json
{
  "success": true,
  "data": {
    "area_m2":            { "value": 500,    "confidence": 1.0 },
    "price":              { "value": 200000, "currency": "EGP", "confidence": 1.0 },
    "property_type":      { "value": "land", "confidence": 1.0 },
    "purpose":            { "value": null,   "confidence": 0.0 },
    "overall_confidence": 0.75
  }
}
```

---

## NLP Approach

The pipeline is **entirely rule-based** — no ML model, no external NLP dependency.

```
Raw Arabic text
      │
      ▼
1. Normalise Arabic
   Strip diacritics, unify alef forms (أ إ آ → ا),
   normalise ة → ه, collapse whitespace
      │
      ▼
2. Regex extraction  (area + price)
   Supports Western (0-9) and Arabic-Indic (٠-٩) digits,
   multiple unit spellings, currency in either order
      │
      ▼
3. Keyword matching  (property_type + purpose)
   Checks normalised text against comprehensive
   Arabic/English keyword dictionaries
      │
      ▼
4. Per-field confidence scoring
   1.0 = strong match  |  0.85 = multiple candidates
   0.75 = partial      |  0.6 = suspicious value
   0.0  = not found
      │
      ▼
Structured JSON response
```

**Why rule-based?**  
Arabic property listings follow highly predictable patterns. Regex + keyword dictionaries give deterministic, explainable results with zero model loading time and no GPU requirement.

---

## Confidence Scoring

| Score | Meaning |
|-------|---------|
| `1.0` | Exact match — keyword + valid number found |
| `0.85` | Multiple candidates — most prominent selected |
| `0.75` | Weak or inferred match |
| `0.6` | Value found but looks suspicious |
| `0.0` | Field not detected |

`overall_confidence` = arithmetic mean of all four field scores.

---



