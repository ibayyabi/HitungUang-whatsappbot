jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}));

const { EventEmitter } = require('events');
const {
    createWhatsappDispatchHandler,
    extractBearerToken,
    normalizeWhatsappNumber,
    sendDispatchMessage
} = require('../services/whatsappDispatchServer');

function createMockRequest({ method = 'POST', url = '/dispatch/whatsapp', headers = {}, body = '' } = {}) {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = headers;
    req.destroy = jest.fn();

    process.nextTick(() => {
        if (body) {
            req.emit('data', Buffer.from(body));
        }
        req.emit('end');
    });

    return req;
}

function createMockResponse() {
    return {
        statusCode: null,
        headers: null,
        body: '',
        writeHead: jest.fn(function writeHead(statusCode, headers) {
            this.statusCode = statusCode;
            this.headers = headers;
        }),
        end: jest.fn(function end(body) {
            this.body = body;
        })
    };
}

async function callHandler(options, handlerOptions = {}) {
    const client = handlerOptions.client || { sendMessage: jest.fn().mockResolvedValue() };
    const handler = createWhatsappDispatchHandler({
        client,
        isReady: handlerOptions.isReady || (() => true),
        secret: handlerOptions.secret || 'secret'
    });
    const req = createMockRequest(options);
    const res = createMockResponse();

    await handler(req, res);

    return {
        client,
        res,
        payload: JSON.parse(res.body)
    };
}

describe('whatsappDispatchServer', () => {
    test('normalizeWhatsappNumber hanya menyisakan digit', () => {
        expect(normalizeWhatsappNumber('+62 812-3456-789')).toBe('628123456789');
    });

    test('extractBearerToken membaca token bearer', () => {
        expect(extractBearerToken('Bearer secret-123')).toBe('secret-123');
        expect(extractBearerToken('Basic secret-123')).toBe('');
    });

    test('sendDispatchMessage mengirim ke chat id whatsapp-web.js', async () => {
        const client = { sendMessage: jest.fn().mockResolvedValue() };

        await sendDispatchMessage({
            client,
            whatsappNumber: '+62 812-3456-789',
            message: 'Halo'
        });

        expect(client.sendMessage).toHaveBeenCalledWith('628123456789@c.us', 'Halo');
    });

    test('handler menolak request tanpa bearer secret valid', async () => {
        const { res, payload } = await callHandler({
            headers: { authorization: 'Bearer wrong' },
            body: JSON.stringify({ whatsapp_number: '628123456789', message: 'Halo' })
        });

        expect(res.statusCode).toBe(401);
        expect(payload.success).toBe(false);
    });

    test('handler menolak saat client belum ready', async () => {
        const { res, payload } = await callHandler({
            headers: { authorization: 'Bearer secret' },
            body: JSON.stringify({ whatsapp_number: '628123456789', message: 'Halo' })
        }, {
            isReady: () => false
        });

        expect(res.statusCode).toBe(503);
        expect(payload.message).toBe('WhatsApp client belum siap.');
    });

    test('handler mengirim pesan untuk payload valid', async () => {
        const client = { sendMessage: jest.fn().mockResolvedValue() };
        const { res, payload } = await callHandler({
            headers: { authorization: 'Bearer secret' },
            body: JSON.stringify({ whatsapp_number: '628123456789', message: 'Halo onboarding' })
        }, {
            client
        });

        expect(res.statusCode).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            sent: true,
            whatsapp_number: '628123456789'
        });
        expect(client.sendMessage).toHaveBeenCalledWith('628123456789@c.us', 'Halo onboarding');
    });
});
