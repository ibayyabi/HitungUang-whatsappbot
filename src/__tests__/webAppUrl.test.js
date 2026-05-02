jest.mock('../utils/logger', () => ({
    warn: jest.fn()
}));

const logger = require('../utils/logger');
const {
    getWebAppUrl,
    normalizeBaseUrl,
    buildWebAppUrl
} = require('../utils/webAppUrl');

describe('webAppUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.WEB_APP_URL;
    });

    test('normalizeBaseUrl menerima http dan https serta menghapus trailing slash', () => {
        expect(normalizeBaseUrl('https://demo.ngrok-free.app/')).toBe('https://demo.ngrok-free.app');
        expect(normalizeBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
        expect(normalizeBaseUrl('ftp://example.test')).toBe('');
        expect(normalizeBaseUrl('bukan-url')).toBe('');
    });

    test('getWebAppUrl memakai WEB_APP_URL valid', () => {
        process.env.WEB_APP_URL = 'https://demo.ngrok-free.app/';

        expect(getWebAppUrl()).toBe('https://demo.ngrok-free.app');
    });

    test('getWebAppUrl fallback localhost dan warning untuk pesan user', () => {
        expect(getWebAppUrl({ forUserMessage: true })).toBe('http://localhost:3000');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('WEB_APP_URL belum dikonfigurasi'));
    });

    test('buildWebAppUrl membuat URL absolute dari path internal', () => {
        process.env.WEB_APP_URL = 'https://demo.ngrok-free.app';

        expect(buildWebAppUrl('/register?whatsapp=628123')).toBe('https://demo.ngrok-free.app/register?whatsapp=628123');
    });
});
