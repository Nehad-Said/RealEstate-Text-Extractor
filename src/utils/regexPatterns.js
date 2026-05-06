/**
 * regexPatterns.js
 * Central store for all regex patterns, Arabic keyword maps,
 * and text-normalisation helpers used by the NLP pipeline.
 */

// ─── Number helpers ────────────────────────────────────────────────────────────

/** Converts Arabic-Indic digits (٠-٩) to Western digits (0-9) */
const toWesternDigits = (str) =>
  String(str).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

/**
 * Parses a raw digit string (may contain Arabic-Indic digits and commas)
 * into a JavaScript number. Returns null if parsing fails.
 */
const parseNumber = (str) => {
  if (!str) return null;
  const n = parseFloat(toWesternDigits(str).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
};

// ─── Arabic text normaliser ────────────────────────────────────────────────────

/**
 * Normalises Arabic text for reliable keyword matching:
 *  • Strips tashkeel (diacritics / harakat)
 *  • Unifies all alef forms → ا
 *  • ta marbuta → ه
 *  • alef maqsura → ي
 */
const normaliseArabic = (text) =>
  text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // strip diacritics
    .replace(/\s+/g, ' ')
    .trim();

// ─── Area regex ────────────────────────────────────────────────────────────────

/**
 * Matches a number immediately followed by an area unit.
 * Supports:
 *   Western + Arabic-Indic digits, optional decimal/comma separator
 *   Units: متر، متر مربع، م²، م2، m²، m2، sqm، sq.m
 */
const AREA_PATTERN = /([0-9٠-٩]+(?:[.,][0-9٠-٩]+)?)\s*(?:متر(?:\s*مربع)?|م\s*[²2٢]|m\s*[²2٢]|sqm|sq\.?m)/gi;

// ─── Price regex ───────────────────────────────────────────────────────────────

/**
 * Matches a price figure + currency keyword in either order.
 *
 * Group layout (one branch will populate, the other will be undefined):
 *   Branch A — number then currency:  m[1]=number  m[2]=currency
 *   Branch B — currency then number:  m[3]=currency  m[4]=number
 */
const PRICE_PATTERN = new RegExp(
  '(?:' +
    // Branch A: 500000 جنيه
    '([0-9٠-٩]+(?:[,.][0-9٠-٩]+)*)\\s*' +
    '(جنيه(?:\\s*مصري)?|دولار|ريال(?:\\s*سعودي)?|درهم|دينار|EGP|USD|SAR|AED|KWD|LE)' +
  '|' +
    // Branch B: EGP 500000
    '(جنيه(?:\\s*مصري)?|دولار|ريال(?:\\s*سعودي)?|درهم|دينار|EGP|USD|SAR|AED|KWD|LE)\\s*' +
    '([0-9٠-٩]+(?:[,.][0-9٠-٩]+)*)' +
  ')',
  'gi'
);

// ─── Currency normalisation ────────────────────────────────────────────────────

const CURRENCY_MAP = {
  'جنيه': 'EGP', 'جنيه مصري': 'EGP', 'le': 'EGP', 'egp': 'EGP',
  'دولار': 'USD', 'usd': 'USD',
  'ريال': 'SAR', 'ريال سعودي': 'SAR', 'sar': 'SAR',
  'درهم': 'AED', 'aed': 'AED',
  'دينار': 'KWD', 'kwd': 'KWD',
};

const normaliseCurrency = (raw) => {
  if (!raw) return 'EGP';
  return CURRENCY_MAP[raw.trim().toLowerCase()] || raw.toUpperCase();
};

// ─── Property type keyword map ─────────────────────────────────────────────────

/**
 * Keys are the canonical English values returned in the API response.
 * Values are Arabic (and some English) keyword variants.
 * All keywords are pre-normalised at match time via normaliseArabic().
 */
const PROPERTY_TYPE_KEYWORDS = {
  apartment: [
    'شقة', 'شقه', 'شقق', 'وحدة سكنية', 'وحده سكنيه',
    'apartment', 'flat', 'studio', 'ستوديو',
  ],
  villa: [
    'فيلا', 'فيلاا', 'فله', 'فلل', 'villa',
    'تاون هاوس', 'townhouse', 'دوبلكس', 'دبلكس', 'duplex', 'قصر',
  ],
  land: [
    'أرض', 'ارض', 'قطعة أرض', 'قطعه ارض', 'land', 'plot',
    'قطعة', 'تربة', 'مساحه',
  ],
  commercial: [
    'محل', 'محلات', 'مكتب', 'مكاتب', 'عقار تجاري', 'تجاري',
    'commercial', 'office', 'مستودع', 'مخزن', 'warehouse',
    'عيادة', 'صيدلية', 'معرض', 'محل تجاري',
  ],
};

// ─── Purpose keyword map ───────────────────────────────────────────────────────

const PURPOSE_KEYWORDS = {
  sale: [
    'للبيع', 'بيع', 'sale', 'for sale', 'يباع',
    'مطروح للبيع', 'تمليك', 'بالتمليك',
  ],
  rent: [
    'للإيجار', 'للايجار', 'إيجار', 'ايجار',
    'rent', 'for rent', 'rental', 'مؤجر',
    'بالإيجار', 'بالايجار', 'إيجاري',
  ],
};

module.exports = {
  AREA_PATTERN,
  PRICE_PATTERN,
  PROPERTY_TYPE_KEYWORDS,
  PURPOSE_KEYWORDS,
  parseNumber,
  normaliseCurrency,
  normaliseArabic,
};

