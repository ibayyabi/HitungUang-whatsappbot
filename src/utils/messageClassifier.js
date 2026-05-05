const { hasCurrencyAmount } = require('./currencyNormalizer');

const QUESTION_STARTERS = ['apa', 'berapa', 'mana', 'kapan', 'siapa', 'gimana', 'bagaimana', 'kenapa', 'mengapa'];
const QUERY_KEYWORDS = ['tampilkan', 'summary', 'ringkas', 'rekap', 'total', 'saldo', 'pengeluaran', 'pemasukan'];
const FINANCIAL_KEYWORDS = [
    'beli', 'bayar', 'bayarin', 'belanja', 'jajan', 'makan', 'minum', 'ngopi', 'bensin',
    'parkir', 'pulsa', 'token', 'listrik', 'air', 'wifi', 'internet', 'sewa', 'cicilan',
    'tagihan', 'ongkir', 'topup', 'top up', 'transfer', 'tf', 'gaji', 'bonus', 'freelance',
    'komisi', 'pendapatan', 'pemasukan', 'pengeluaran', 'masuk', 'keluar', 'cashback',
    'donasi', 'sedekah', 'zakat', 'bayarin', 'tiket'
];

function normalizeText(text) {
    return (text || '').trim().toLowerCase();
}

function hasQuestionIntent(text) {
    const normalized = normalizeText(text);

    if (!normalized) {
        return false;
    }

    if (normalized.includes('?')) {
        return true;
    }

    return QUESTION_STARTERS.some((keyword) => normalized.startsWith(`${keyword} `)) ||
        QUERY_KEYWORDS.some((keyword) => normalized.startsWith(`${keyword} `));
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
    isLikelyTransactionText,
    hasTransactionAmount,
    hasFinancialKeyword
};
