const http = require('http');
const { URL } = require('url');
const { handleMessage } = require('./handlers/messageHandler');
const fonnteService = require('./services/fonnteService');
const RateLimiter = require('./utils/rateLimiter');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

dotenv.config();

const limiter = new RateLimiter(10, 60000);
const port = Number(process.env.PORT || process.env.BOT_PORT || 3001);
const webhookPath = process.env.FONNTE_WEBHOOK_PATH || '/webhook/fonnte';
const connectWebhookPath = process.env.FONNTE_CONNECT_WEBHOOK_PATH || '/webhook/fonnte/connect';
const messageStatusWebhookPath = process.env.FONNTE_MESSAGE_STATUS_WEBHOOK_PATH || '/webhook/fonnte/message-status';
const webhookSecret = process.env.FONNTE_WEBHOOK_SECRET || '';
const publicWebhookUrl = process.env.FONNTE_PUBLIC_WEBHOOK_URL || '';

function normalizePhone(value) {
    return String(value || '').replace(/[^\d]/g, '');
}

function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
}

function getIncomingText(payload) {
    return pickFirstString(
        payload.message,
        payload.text,
        payload.body,
        payload.caption,
        payload.content,
        payload.quoted_message
    );
}

function getSenderId(payload) {
    return normalizePhone(pickFirstString(
        payload.sender,
        payload.from,
        payload.number,
        payload.whatsapp,
        payload.target,
        payload.phone
    ));
}

function getMediaUrl(payload) {
    return pickFirstString(
        payload.url,
        payload.media,
        payload.media_url,
        payload.file,
        payload.file_url,
        payload.attachment
    );
}

function inferMediaType(payload, mediaUrl) {
    const explicitType = pickFirstString(payload.type, payload.message_type, payload.media_type).toLowerCase();
    if (['image', 'photo', 'picture'].includes(explicitType)) return 'image';
    if (['audio', 'voice', 'ptt'].includes(explicitType)) return 'audio';

    const loweredUrl = String(mediaUrl || '').toLowerCase();
    if (/\.(png|jpe?g|webp)(\?|$)/.test(loweredUrl)) return 'image';
    if (/\.(ogg|mp3|m4a|wav|mpeg)(\?|$)/.test(loweredUrl)) return 'audio';

    return mediaUrl ? 'document' : 'text';
}

function inferMimeType(response, mediaUrl, mediaType) {
    const contentType = response.headers.get('content-type');
    if (contentType) return contentType.split(';')[0];

    const loweredUrl = String(mediaUrl || '').toLowerCase();
    if (loweredUrl.includes('.png')) return 'image/png';
    if (loweredUrl.includes('.webp')) return 'image/webp';
    if (loweredUrl.includes('.jpg') || loweredUrl.includes('.jpeg')) return 'image/jpeg';
    if (loweredUrl.includes('.ogg')) return 'audio/ogg';
    if (loweredUrl.includes('.mp3')) return 'audio/mpeg';
    if (loweredUrl.includes('.m4a')) return 'audio/mp4';

    if (mediaType === 'image') return 'image/jpeg';
    if (mediaType === 'audio' || mediaType === 'voice') return 'audio/mpeg';

    return 'application/octet-stream';
}

async function downloadFonnteMedia(mediaUrl, mediaType) {
    const response = await fetch(mediaUrl);

    if (!response.ok) {
        throw new Error(`Gagal download media WhatsApp: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
        mimetype: inferMimeType(response, mediaUrl, mediaType),
        data: buffer.toString('base64'),
        filename: mediaUrl.split('/').pop() || 'whatsapp-media'
    };
}

function createMessageAdapter(payload) {
    const senderId = getSenderId(payload);
    const mediaUrl = getMediaUrl(payload);
    const mediaType = inferMediaType(payload, mediaUrl);
    const inboxId = payload.inboxid || payload.inbox_id || payload.id || 0;

    return {
        text: getIncomingText(payload),
        hasMedia: Boolean(mediaUrl),
        mediaType,
        senderId,
        chatId: senderId,
        chatType: 'private',
        displayName: pickFirstString(payload.name, payload.sender_name, payload.pushname, payload.profile_name),
        username: '',
        reply: (replyText) => fonnteService.sendMessage({
            target: senderId,
            message: replyText,
            inboxId
        }),
        downloadMedia: () => downloadFonnteMedia(mediaUrl, mediaType)
    };
}

async function parseRequestBody(request) {
    const chunks = [];

    for await (const chunk of request) {
        chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};

    const contentType = request.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
        return JSON.parse(raw);
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
        return Object.fromEntries(new URLSearchParams(raw));
    }

    try {
        return JSON.parse(raw);
    } catch {
        return Object.fromEntries(new URLSearchParams(raw));
    }
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
}

function isAuthorized(requestUrl, request) {
    if (!webhookSecret) return true;

    const headerSecret = request.headers['x-webhook-secret'];
    const querySecret = requestUrl.searchParams.get('secret');

    return headerSecret === webhookSecret || querySecret === webhookSecret;
}

async function processWebhook(request, response, requestUrl) {
    if (!isAuthorized(requestUrl, request)) {
        return sendJson(response, 401, { success: false, message: 'Unauthorized webhook.' });
    }

    const payload = await parseRequestBody(request);
    const message = createMessageAdapter(payload);

    if (!message.senderId) {
        logger.warn(`Webhook Fonnte tanpa sender valid: ${JSON.stringify(payload)}`);
        return sendJson(response, 400, { success: false, message: 'Sender WhatsApp tidak valid.' });
    }

    if (limiter.isRateLimited(message.senderId)) {
        logger.warn(`Rate limit terlampaui untuk WhatsApp user ${message.senderId}`);
        await message.reply('⚠️ Anda mengirim pesan terlalu cepat. Silakan tunggu sebentar.');
        return sendJson(response, 429, { success: false, message: 'Rate limited.' });
    }

    await handleMessage(message);
    return sendJson(response, 200, { success: true });
}

async function processEventWebhook(request, response, requestUrl, eventName) {
    if (!isAuthorized(requestUrl, request)) {
        return sendJson(response, 401, { success: false, message: 'Unauthorized webhook.' });
    }

    const payload = await parseRequestBody(request);
    logger.info(`Webhook Fonnte ${eventName}: ${JSON.stringify(payload)}`);
    return sendJson(response, 200, { success: true });
}

const server = http.createServer(async (request, response) => {
    try {
        const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

        if (request.method === 'GET' && requestUrl.pathname === '/health') {
            return sendJson(response, 200, { status: 'ok', platform: 'whatsapp-fonnte' });
        }

        if (request.method === 'POST' && requestUrl.pathname === webhookPath) {
            return await processWebhook(request, response, requestUrl);
        }

        if (request.method === 'POST' && requestUrl.pathname === connectWebhookPath) {
            return await processEventWebhook(request, response, requestUrl, 'connect');
        }

        if (request.method === 'POST' && requestUrl.pathname === messageStatusWebhookPath) {
            return await processEventWebhook(request, response, requestUrl, 'message-status');
        }

        return sendJson(response, 404, {
            success: false,
            message: `Endpoint tidak ditemukan. Gunakan POST ${webhookPath}.`
        });
    } catch (error) {
        logger.error(`Gagal memproses webhook Fonnte: ${error.stack || error.message}`);
        return sendJson(response, 500, { success: false, message: 'Internal server error.' });
    }
});

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
    logger.error(`Unhandled promise rejection: ${message}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.stack || error.message}`);
});

server.listen(port, () => {
    logger.info(`Webhook WhatsApp Fonnte siap di port ${port}, path ${webhookPath}.`);
    const localWebhookUrl = `http://localhost:${port}${webhookPath}`;
    console.log(`Webhook WhatsApp Fonnte siap: ${publicWebhookUrl || localWebhookUrl}`);
    if (!publicWebhookUrl) {
        console.log(`Set FONNTE_PUBLIC_WEBHOOK_URL untuk menampilkan URL publik yang dipakai Fonnte.`);
    }
});

const shutdown = () => {
    logger.info('Menghentikan webhook WhatsApp Fonnte...');
    server.close(() => {
        logger.info('Webhook WhatsApp Fonnte berhasil dihentikan.');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = {
    createMessageAdapter,
    getIncomingText,
    getSenderId,
    inferMediaType
};
