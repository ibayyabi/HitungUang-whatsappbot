const http = require('http');
const logger = require('../utils/logger');

const DEFAULT_DISPATCH_PORT = 3001;
const MAX_BODY_BYTES = 64 * 1024;

function normalizeWhatsappNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function createJsonResponse(res, statusCode, payload) {
    const body = JSON.stringify(payload);

    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
}

function extractBearerToken(headerValue) {
    const match = String(headerValue || '').match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;

            if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                reject(new Error('Payload terlalu besar.'));
                req.destroy();
            }
        });

        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (_error) {
                reject(new Error('Payload JSON tidak valid.'));
            }
        });

        req.on('error', reject);
    });
}

async function sendDispatchMessage({ client, whatsappNumber, message }) {
    const normalizedNumber = normalizeWhatsappNumber(whatsappNumber);
    const normalizedMessage = String(message || '').trim();

    if (!normalizedNumber || normalizedNumber.length < 8) {
        throw new Error('Nomor WhatsApp tidak valid.');
    }

    if (!normalizedMessage) {
        throw new Error('Pesan wajib diisi.');
    }

    const chatId = `${normalizedNumber}@c.us`;
    await client.sendMessage(chatId, normalizedMessage);

    return {
        chatId,
        whatsappNumber: normalizedNumber
    };
}

function createWhatsappDispatchHandler({ client, isReady, secret }) {
    return async function handleDispatchRequest(req, res) {
        if (req.method !== 'POST' || req.url !== '/dispatch/whatsapp') {
            createJsonResponse(res, 404, {
                success: false,
                message: 'Endpoint tidak ditemukan.'
            });
            return;
        }

        if (secret && extractBearerToken(req.headers.authorization) !== secret) {
            createJsonResponse(res, 401, {
                success: false,
                message: 'Unauthorized.'
            });
            return;
        }

        if (typeof isReady === 'function' && !isReady()) {
            createJsonResponse(res, 503, {
                success: false,
                message: 'WhatsApp client belum siap.'
            });
            return;
        }

        try {
            const payload = await readJsonBody(req);
            const result = await sendDispatchMessage({
                client,
                whatsappNumber: payload.whatsapp_number,
                message: payload.message
            });

            logger.info(`Dispatch WhatsApp terkirim ke ${result.whatsappNumber}`);
            createJsonResponse(res, 200, {
                success: true,
                sent: true,
                whatsapp_number: result.whatsappNumber
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengirim pesan WhatsApp.';
            const statusCode = message.includes('tidak valid') || message.includes('wajib') || message.includes('JSON') || message.includes('terlalu besar')
                ? 400
                : 500;

            logger.error(`Dispatch WhatsApp gagal: ${message}`);
            createJsonResponse(res, statusCode, {
                success: false,
                message
            });
        }
    };
}

function startWhatsappDispatchServer({ client, isReady }) {
    const enabled = String(process.env.WHATSAPP_DISPATCH_SERVER_ENABLED || '').toLowerCase() === 'true';

    if (!enabled) {
        logger.info('WhatsApp dispatch server nonaktif.');
        return null;
    }

    const port = Number(process.env.WHATSAPP_DISPATCH_PORT || DEFAULT_DISPATCH_PORT);
    const host = process.env.WHATSAPP_DISPATCH_HOST || '127.0.0.1';
    const secret = process.env.WHATSAPP_DISPATCH_WEBHOOK_SECRET || '';
    const server = http.createServer(createWhatsappDispatchHandler({
        client,
        isReady,
        secret
    }));

    server.listen(port, host, () => {
        logger.info(`WhatsApp dispatch server listening di http://${host}:${port}/dispatch/whatsapp`);
    });

    server.on('error', (error) => {
        logger.error(`WhatsApp dispatch server error: ${error.message}`);
    });

    return server;
}

module.exports = {
    DEFAULT_DISPATCH_PORT,
    normalizeWhatsappNumber,
    extractBearerToken,
    sendDispatchMessage,
    createWhatsappDispatchHandler,
    startWhatsappDispatchServer
};
