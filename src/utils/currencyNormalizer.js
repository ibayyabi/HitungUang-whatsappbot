const CURRENCY_TOKEN_PATTERN = /\b(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta|miliyar|milyar|miliar|rupiah)?\b/gi;

const MULTIPLIERS = {
    rb: 1000,
    ribu: 1000,
    k: 1000,
    jt: 1000000,
    juta: 1000000,
    miliyar: 1000000000,
    milyar: 1000000000,
    miliar: 1000000000
};

function normalizeSuffix(value) {
    return String(value || '').trim().toLowerCase();
}

function parseNumericPart(rawNumber, hasMultiplier) {
    const value = String(rawNumber || '').trim();

    if (!value) {
        return NaN;
    }

    if (!hasMultiplier) {
        return Number(value.replace(/[.,]/g, ''));
    }

    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    if (hasComma && hasDot) {
        const lastComma = value.lastIndexOf(',');
        const lastDot = value.lastIndexOf('.');
        const normalized = lastComma > lastDot
            ? value.replace(/\./g, '').replace(',', '.')
            : value.replace(/,/g, '');
        return Number(normalized);
    }

    if (hasComma) {
        return Number(value.replace(',', '.'));
    }

    if (hasDot) {
        if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
            return Number(value.replace(/\./g, ''));
        }

        return Number(value);
    }

    return Number(value);
}

function parseCurrencyAmount(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : NaN;
    }

    const text = String(value || '').trim().toLowerCase();

    if (!text) {
        return NaN;
    }

    CURRENCY_TOKEN_PATTERN.lastIndex = 0;
    const match = CURRENCY_TOKEN_PATTERN.exec(text);

    if (!match) {
        return Number(text.replace(/[^\d.,-]/g, '').replace(/[.,]/g, ''));
    }

    const rawSuffix = normalizeSuffix(match[2]);
    const multiplier = MULTIPLIERS[rawSuffix] || 1;
    const parsedNumber = parseNumericPart(match[1], multiplier !== 1);

    if (!Number.isFinite(parsedNumber)) {
        return NaN;
    }

    return Math.round(parsedNumber * multiplier);
}

function hasCurrencyAmount(text) {
    const normalized = String(text || '').trim().toLowerCase();

    if (!normalized) {
        return false;
    }

    CURRENCY_TOKEN_PATTERN.lastIndex = 0;
    const matches = normalized.match(CURRENCY_TOKEN_PATTERN) || [];

    return matches.some((rawToken) => {
        const rawPrefix = /^rp/i.test(rawToken.trim());
        CURRENCY_TOKEN_PATTERN.lastIndex = 0;
        const match = CURRENCY_TOKEN_PATTERN.exec(rawToken);

        if (!match) {
            return false;
        }

        const suffix = normalizeSuffix(match[2]);

        if (rawPrefix || suffix) {
            return true;
        }

        const amount = parseCurrencyAmount(rawToken);
        return Number.isFinite(amount) && amount >= 1000;
    });
}

function normalizeCurrencyText(text) {
    return String(text || '').replace(CURRENCY_TOKEN_PATTERN, (fullMatch, rawNumber, rawSuffix) => {
        const suffix = normalizeSuffix(rawSuffix);
        const hasPrefix = /^rp/i.test(fullMatch.trim());

        if (!suffix && !hasPrefix) {
            return fullMatch;
        }

        const amount = parseCurrencyAmount(fullMatch);

        if (!Number.isFinite(amount) || amount <= 0) {
            return fullMatch;
        }

        return `${amount} rupiah`;
    });
}

module.exports = {
    CURRENCY_TOKEN_PATTERN,
    MULTIPLIERS,
    hasCurrencyAmount,
    normalizeCurrencyText,
    parseCurrencyAmount
};
