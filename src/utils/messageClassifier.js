const { hasCurrencyAmount } = require('./currencyNormalizer');

const QUESTION_STARTERS = [
  'apa',
  'berapa',
  'mana',
  'kapan',
  'siapa',
  'gimana',
  'bagaimana',
  'kenapa',
  'mengapa'
];

const QUERY_KEYWORDS = [
  'tampilkan',
  'tampilin',
  'summary',
  'ringkas',
  'ringkasan',
  'rekap',
  'laporan',
  'total',
  'saldo',
  'pengeluaran',
  'pemasukan',
  'cek',
  'lihat',
  'liat'
];

const FINANCIAL_KEYWORDS = [
  'beli',
  'bayar',
  'bayarin',
  'belanja',
  'jajan',
  'makan',
  'minum',
  'ngopi',
  'bensin',
  'parkir',
  'pulsa',
  'token',
  'listrik',
  'air',
  'wifi',
  'internet',
  'sewa',
  'cicilan',
  'tagihan',
  'ongkir',
  'topup',
  'top up',
  'transfer',
  'tf',
  'gaji',
  'bonus',
  'freelance',
  'komisi',
  'pendapatan',
  'pemasukan',
  'pengeluaran',
  'masuk',
  'keluar',
  'cashback',
  'donasi',
  'sedekah',
  'zakat',
  'tiket'
];

const DASHBOARD_DIRECT_PHRASES = new Set([
  '/dashboard',
  'dashboard',
  'dasbor',
  'dashbord',
  'buka dashboard',
  'bukain dashboard',
  'akses dashboard',
  'minta dashboard',
  'mintain dashboard',
  'berikan dashboard',
  'kasih dashboard',
  'kirim dashboard',
  'tolong dashboard',
  'mau dashboard',
  'ingin dashboard',
  'pengen dashboard',
  'lihat dashboard',
  'liat dashboard',
  'cek dashboard',
  'check dashboard',
  'login dashboard',
  'masuk dashboard',
  'link dashboard',
  'tautan dashboard',
  'url dashboard',
  'link web',
  'link website',
  'link aplikasi',
  'buka web',
  'buka website',
  'buka aplikasi',
  'buka app',
  'login web',
  'masuk web',
  'mau lihat dashboard',
  'ingin lihat dashboard',
  'pengen lihat dashboard',
  'mau lihat ringkasan',
  'ingin lihat ringkasan',
  'pengen lihat ringkasan',
  'lihat ringkasan',
  'liat ringkasan',
  'cek ringkasan',
  'minta ringkasan',
  'berikan ringkasan',
  'kirim ringkasan',
  'mau lihat rekap',
  'lihat rekap',
  'minta rekap',
  'mau lihat laporan',
  'lihat laporan',
  'minta laporan',
  'buka ringkasan',
  'buka rekap',
  'buka laporan',
  'akses ringkasan',
  'akses rekap',
  'akses laporan'
]);

const DASHBOARD_REGEX_PATTERNS = [
  /\b(?:dashboard|dasbor|dashbord)\b/i,

  /\b(?:minta|mintain|mau|ingin|pengen|tolong|coba|boleh|bisa|kirim|kirimin|kasih|berikan|bantu(?:in)?|akses|buka|bukain|lihat|liat|cek|check|open)\b(?:\s+\w+){0,4}\s+\b(?:dashboard|dasbor|dashbord)\b/i,

  /\b(?:link|tautan|url)\b(?:\s+\w+){0,4}\s+\b(?:dashboard|web|website|app|aplikasi)\b/i,

  /\b(?:buka|bukain|akses|open|login|masuk(?:\s+ke)?|lihat|liat|cek|check)\b(?:\s+\w+){0,4}\s+\b(?:web|website|dashboard|app|aplikasi)\b/i,

  /\b(?:mau|ingin|pengen|tolong|bisa|coba|lihat|liat|cek|check|tampilkan|tampilin|berikan|kasih|kirim|buka|akses)\b(?:\s+\w+){0,4}\s+\b(?:ringkasan|summary|rekap|laporan|overview)\b/i
];

function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeIntentText(text) {
  return normalizeText(text)
    .replace(/[^\w\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDashboardIntent(text) {
  const normalized = normalizeIntentText(text);

  if (!normalized) {
    return false;
  }

  if (DASHBOARD_DIRECT_PHRASES.has(normalized)) {
    return true;
  }

  const explicitlyDashboardRelated = /\b(?:dashboard|dasbor|dashbord|web|website|app|aplikasi|link|tautan|url)\b/i.test(normalized);

  const summaryAccessIntent = /\b(?:lihat|liat|cek|check|buka|akses|minta|kirim|kasih|berikan|mau|ingin|pengen|tampilkan|tampilin)\b(?:\s+\w+){0,4}\s+\b(?:ringkasan|summary|rekap|laporan|overview)\b/i.test(normalized);

  const looksLikeAnalyticalQuestion =
    /\b(?:berapa|total|saldo|sisa|pengeluaran|pemasukan)\b/i.test(normalized) &&
    !explicitlyDashboardRelated &&
    !summaryAccessIntent;

  if (looksLikeAnalyticalQuestion) {
    return false;
  }

  return DASHBOARD_REGEX_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasQuestionIntent(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return false;
  }

  if (hasDashboardIntent(normalized)) {
    return false;
  }

  if (normalized.includes('?')) {
    return true;
  }

  return (
    QUESTION_STARTERS.some((keyword) => normalized.startsWith(`${keyword} `)) ||
    QUERY_KEYWORDS.some((keyword) => normalized.startsWith(`${keyword} `))
  );
}

function hasTransactionAmount(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return false;
  }

  return hasCurrencyAmount(normalized);
}

function hasFinancialKeyword(text) {
  const normalized = normalizeText(text);
  return FINANCIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isLikelyTransactionText(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return false;
  }

  if (!hasTransactionAmount(normalized)) {
    return false;
  }

  if (hasFinancialKeyword(normalized)) {
    return true;
  }

  return normalized.split(/\s+/).length >= 2;
}

function classifyMessage({ text, hasMedia }) {
  const normalized = normalizeText(text);
  const question = !hasMedia && hasQuestionIntent(normalized);
  const transaction = !hasMedia && isLikelyTransactionText(normalized);

  if (hasMedia) {
    return {
      normalizedText: normalized,
      isQuestion: false,
      isTransactionText: false,
      shouldProcess: true,
      mode: 'media'
    };
  }

  if (transaction) {
    return {
      normalizedText: normalized,
      isQuestion: false,
      isTransactionText: true,
      shouldProcess: true,
      mode: 'transaction'
    };
  }

  if (question) {
    return {
      normalizedText: normalized,
      isQuestion: true,
      isTransactionText: false,
      shouldProcess: true,
      mode: 'question'
    };
  }

  return {
    normalizedText: normalized,
    isQuestion: false,
    isTransactionText: false,
    shouldProcess: false,
    mode: 'ignore'
  };
}

module.exports = {
  classifyMessage,
  hasQuestionIntent,
  hasDashboardIntent,
  isLikelyTransactionText,
  hasTransactionAmount,
  hasFinancialKeyword,
  normalizeText
};