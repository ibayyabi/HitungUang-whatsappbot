const logger = require('../utils/logger');

async function sendMessage({ target, message, inboxId = 0 }) {
    const token = process.env.FONNTE_TOKEN || '';
    const sendUrl = process.env.FONNTE_SEND_URL || 'https://api.fonnte.com/send';
    const countryCode = process.env.FONNTE_COUNTRY_CODE || '62';

    if (!token) {
        throw new Error('FONNTE_TOKEN belum diset.');
    }

    if (!target) {
        throw new Error('Target WhatsApp kosong.');
    }

    const body = new URLSearchParams({
        target: String(target),
        message: String(message || ''),
        countryCode,
        typing: 'false'
    });

    if (inboxId) {
        body.set('inboxid', String(inboxId));
    }

    const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
            Authorization: token
        },
        body
    });

    const rawBody = await response.text();
    let result;

    try {
        result = JSON.parse(rawBody);
    } catch {
        result = { status: response.ok, raw: rawBody };
    }

    if (!response.ok || result.status === false) {
        const reason = result.reason || result.message || rawBody || response.statusText;
        logger.error(`Gagal kirim pesan Fonnte ke ${target}: ${reason}`);
        throw new Error(`Gagal kirim pesan Fonnte: ${reason}`);
    }

    return result;
}

module.exports = {
    sendMessage
};
