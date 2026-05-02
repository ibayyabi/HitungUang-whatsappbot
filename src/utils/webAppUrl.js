const logger = require('./logger');

const LOCAL_WEB_APP_URL = 'http://localhost:3000';

function normalizeBaseUrl(value) {
    const rawValue = String(value || '').trim();

    if (!rawValue) {
        return '';
    }

    try {
        const url = new URL(rawValue);

        if (!['http:', 'https:'].includes(url.protocol)) {
            return '';
        }

        url.pathname = url.pathname.replace(/\/+$/, '');
        url.search = '';
        url.hash = '';

        return url.toString().replace(/\/$/, '');
    } catch (_error) {
        return '';
    }
}

function getWebAppUrl({ forUserMessage = false } = {}) {
    const configuredUrl = normalizeBaseUrl(process.env.WEB_APP_URL);

    if (configuredUrl) {
        return configuredUrl;
    }

    if (forUserMessage) {
        logger.warn('WEB_APP_URL belum dikonfigurasi. Link publik bot fallback ke http://localhost:3000 dan tidak akan bisa dibuka user dari luar mesin dev.');
    }

    return LOCAL_WEB_APP_URL;
}

function buildWebAppUrl(pathname, { forUserMessage = false } = {}) {
    return new URL(pathname, getWebAppUrl({ forUserMessage })).toString();
}

module.exports = {
    LOCAL_WEB_APP_URL,
    normalizeBaseUrl,
    getWebAppUrl,
    buildWebAppUrl
};
