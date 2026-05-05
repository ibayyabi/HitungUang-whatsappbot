const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function toDate(value) {
    return value instanceof Date ? value : new Date(value || Date.now());
}

function getJakartaMonthKey(value = new Date()) {
    const date = toDate(value);
    const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
}

function getJakartaMonthRange(value = new Date()) {
    const date = toDate(value);
    const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const startUtc = Date.UTC(year, month, 1, 0, 0, 0, 0) - JAKARTA_OFFSET_MS;
    const endUtc = Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - JAKARTA_OFFSET_MS - 1;

    return {
        startIso: new Date(startUtc).toISOString(),
        endIso: new Date(endUtc).toISOString()
    };
}

module.exports = {
    JAKARTA_OFFSET_MS,
    getJakartaMonthKey,
    getJakartaMonthRange
};
