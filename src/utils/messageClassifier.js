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

    const currencyPattern = /\b(?:rp\.?\s*)?\d[\d.,]*\s*(?:rb|ribu|k|jt|juta|milyar|miliar|rupiah)?\b/i;
    const matches = normalized.match(/\b(?:rp\.?\s*)?\d[\d.,]*\s*(?:rb|ribu|k|jt|juta|milyar|miliar|rupiah)?\b/gi) || [];

    if (!currencyPattern.test(normalized)) {
        return false;
    }

    return matches.some((rawToken) => {
        const token = rawToken.toLowerCase().replace(/rp\.?\s*/g, '').trim();
        const numericValue = parseFloat(token.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
        const hasCurrencySuffix = /(rb|ribu|k|jt|juta|milyar|miliar|rupiah)/.test(token) || /^rp/.test(rawToken.toLowerCase());

        if (hasCurrencySuffix) {
            return true;
        }

        return Number.isFinite(numericValue) && numericValue >= 1000;
    });
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
