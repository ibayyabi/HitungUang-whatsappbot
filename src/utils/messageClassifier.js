const { hasCurrencyAmount } = require('./currencyNormalizer');

const QUESTION_STARTERS = [
  'apa',
  'apaan',
  'berapa',
  'brp',
  'mana',
  'mn',
  'kapan',
  'kapn',
  'siapa',
  'sapa',
  'gimana',
  'gmn',
  'bagaimana',
  'bgmn',
  'kenapa',
  'knp',
  'mengapa'
];

const QUERY_KEYWORDS = [
  'tampilkan',
  'tampilin',
  'tampilin dong',
  'summary',
  'ringkas',
  'ringkasan',
  'rekap',
  'laporan',
  'laporannya',
  'total',
  'saldo',
  'pengeluaran',
  'pemasukan',
  'lihat',
  'liat',
  'cek',
  'check',
  'bukain',
  'buka',
  'kasih',
  'berikan',
  'kirim'
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
  'tiket',
  'nabung',
  'tabungan'
];

const DASHBOARD_NOUNS = [
  'dashboard',
  'dashbord',
  'dahsboard',
  'dashboar',
  'dash',
  'dasbor',
  'dasbo',
  'rekap',
  'ringkasan',
  'summary',
  'laporan',
  'web',
  'website',
  'webnya',
  'situs',
  'app',
  'aplikasi',
  'link',
  'linknya',
  'tautan',
  'url'
];

const DASHBOARD_VERBS = [
  'buka',
  'bukain',
  'bukakan',
  'akses',
  'access',
  'login',
  'masuk',
  'masukin',
  'lihat',
  'liat',
  'liatin',
  'cek',
  'check',
  'kasih',
  'berikan',
  'kirim',
  'kirimin',
  'minta',
  'mintain',
  'mau',
  'mo',
  'mw',
  'pengen',
  'pingin',
  'ingin',
  'pgn',
  'butuh',
  'perlu',
  'boleh',
  'blh',
  'bisa',
  'coba',
  'tolong',
  'dong'
];

const INFORMAL_FILLERS = new Set([
  'dong',
  'nih',
  'ya',
  'yah',
  'pls',
  'please',
  'tolong',
  'cuy',
  'bro',
  'sis',
  'min',
  'admin',
  'gan',
  'kak',
  'bang',
  'mas',
  'mba',
  'gue',
  'gw',
  'aku',
  'saya',
  'sy',
  'gua',
  'gwe',
  'deh',
  'aja',
  'doang',
  'nihh',
  'plis'
]);

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSlangTokens(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return '';
  }

  const tokenMap = {
    brp: 'berapa',
    gmn: 'gimana',
    bgmn: 'bagaimana',
    knp: 'kenapa',
    mn: 'mana',
    kapn: 'kapan',
    sapa: 'siapa',
    mo: 'mau',
    mw: 'mau',
    pgn: 'pengen',
    blh: 'boleh',
    liat: 'lihat',
    liatin: 'lihat',
    cekin: 'cek',
    bukain: 'buka',
    bukakan: 'buka',
    kasihin: 'kasih',
    kirimin: 'kirim',
    mintain: 'minta',
    webnya: 'web',
    linknya: 'link',
    dashbord: 'dashboard',
    dahsboard: 'dashboard',
    dashboar: 'dashboard',
    dasbor: 'dashboard',
    dasbo: 'dashboard',
    dash: 'dashboard',
    appnya: 'app',
    aplikasinya: 'aplikasi',
    laporannya: 'laporan',
    ringkasannya: 'ringkasan',
    rekapnya: 'rekap',
    summarynya: 'summary'
  };

  return normalized
    .split(' ')
    .map((token) => tokenMap[token] || token)
    .join(' ');
}

function removeFillerTokens(text) {
  return normalizeSlangTokens(text)
    .split(' ')
    .filter((token) => token && !INFORMAL_FILLERS.has(token))
    .join(' ');
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasDashboardIntent(text) {
  const normalized = normalizeSlangTokens(text);
  const compact = removeFillerTokens(text);

  if (!normalized) {
    return false;
  }

  if (
    normalized === '/dashboard' ||
    normalized === 'dashboard' ||
    normalized === 'link dashboard' ||
    normalized === 'buka dashboard' ||
    normalized === 'lihat dashboard' ||
    normalized === 'cek dashboard' ||
    normalized === 'minta dashboard' ||
    normalized === 'link web' ||
    normalized === 'buka web' ||
    normalized === 'lihat rekap' ||
    normalized === 'lihat ringkasan' ||
    compact === 'dashboard' ||
    compact === 'web' ||
    compact === 'rekap' ||
    compact === 'ringkasan' ||
    compact === 'laporan'
  ) {
    return true;
  }

  const hasDashboardWord = hasAnyKeyword(normalized, DASHBOARD_NOUNS);
  const hasDashboardVerb = hasAnyKeyword(normalized, DASHBOARD_VERBS);

  const dashboardPhrasePatterns = [
    /\b(?:buka|akses|login|masuk|lihat|cek|kasih|berikan|kirim|minta|mau|pengen|ingin|butuh|perlu|boleh|bisa)\b(?:\s+\w+){0,4}\s+\b(?:dashboard|web|website|app|aplikasi|link)\b/,
    /\b(?:dashboard|web|website|app|aplikasi|link)\b(?:\s+\w+){0,4}\s+\b(?:dong|pls|please|tolong)\b/,
    /\b(?:lihat|cek|buka|minta|kirim|kasih|berikan|mau|pengen|ingin)\b(?:\s+\w+){0,4}\s+\b(?:rekap|ringkasan|summary|laporan)\b/,
    /\b(?:rekap|ringkasan|summary|laporan)\b(?:\s+\w+){0,4}\s+\b(?:dong|pls|please|tolong)\b/,
    /\b(?:cek|lihat)\b(?:\s+\w+){0,4}\s+\b(?:saldo|duit|duid|uang)\b(?:\s+\w+){0,4}\s+\b(?:web|dashboard|rekap|ringkasan)\b/,
    /\b(?:minta|kasih|kirim|berikan)\b(?:\s+\w+){0,4}\s+\b(?:link|tautan|url)\b/,
    /\b(?:web|dashboard|rekap|ringkasan|laporan)\b\s+(?:dong|nih|ya|yah|pls|please)\b/
  ];

  if (dashboardPhrasePatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (hasDashboardWord && hasDashboardVerb) {
    return true;
  }

  if (
    /\b(?:saldo|duit|duid|uang)\b/.test(normalized) &&
    /\b(?:web|dashboard|rekap|ringkasan|laporan)\b/.test(normalized)
  ) {
    return true;
  }

  return false;
}

function hasQuestionIntent(text) {
  const normalized = normalizeSlangTokens(text);

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
  const normalized = normalizeSlangTokens(text);
  return FINANCIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isLikelyTransactionText(text) {
  const normalized = normalizeSlangTokens(text);

  if (!normalized) {
    return false;
  }

  if (hasDashboardIntent(normalized)) {
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
  const normalized = normalizeSlangTokens(text);
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
  normalizeText,
  normalizeSlangTokens
};