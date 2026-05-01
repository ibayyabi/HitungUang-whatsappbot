jest.mock('../services/aiParser', () => ({
    parseExpense: jest.fn(),
    parseImage: jest.fn(),
    parseAudio: jest.fn(),
    model: { generateContent: jest.fn() }
}));

jest.mock('../services/dbService', () => ({
    getUserByWhatsapp: jest.fn(),
    appendTransactions: jest.fn(),
    supabase: {}
}));

jest.mock('../services/nl2sqlService', () => ({
    processNLQuery: jest.fn()
}));

jest.mock('../services/authLinkService', () => ({
    requestAuthLink: jest.fn()
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const aiParser = require('../services/aiParser');
const authLinkService = require('../services/authLinkService');
const dbService = require('../services/dbService');
const nl2sqlService = require('../services/nl2sqlService');
const { handleMessage } = require('../handlers/messageHandler');

function createMessage(body) {
    return {
        body,
        hasMedia: false,
        type: 'chat',
        getContact: jest.fn().mockResolvedValue({ number: '628123' }),
        reply: jest.fn().mockResolvedValue()
    };
}

describe('handleMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        dbService.getUserByWhatsapp.mockResolvedValue({ id: 'user-1' });
        dbService.appendTransactions.mockResolvedValue({ success: true, insertedCount: 1 });
        authLinkService.requestAuthLink.mockResolvedValue({
            actionLink: 'https://supabase.test/magic'
        });
    });

    test('mencatat transaksi pemasukan meski mengandung frasa bulan ini', async () => {
        const msg = createMessage('Gaji bulan ini cair 5 juta');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Gaji Bulan Ini',
            harga: 5000000,
            kategori: 'gaji',
            tipe: 'pemasukan'
        });

        await handleMessage(msg);

        expect(nl2sqlService.processNLQuery).not.toHaveBeenCalled();
        expect(dbService.appendTransactions).toHaveBeenCalledTimes(1);
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Berhasil Dicatat'));
    });

    test('mengarahkan pertanyaan summary ke service NL2SQL', async () => {
        const msg = createMessage('Total pengeluaran bulan ini berapa?');
        nl2sqlService.processNLQuery.mockResolvedValue('ringkasan');

        await handleMessage(msg);

        expect(nl2sqlService.processNLQuery).toHaveBeenCalledWith(msg, '628123', { id: 'user-1' });
        expect(dbService.appendTransactions).not.toHaveBeenCalled();
        expect(msg.reply).toHaveBeenCalledWith('ringkasan');
    });

    test('memberi tahu user ketika chat yang sama sudah pernah tercatat', async () => {
        const msg = createMessage('Bensin mobil 150rb');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Bensin Mobil',
            harga: 150000,
            kategori: 'transport',
            tipe: 'pengeluaran'
        });
        dbService.appendTransactions.mockResolvedValue({
            success: true,
            duplicate: true,
            insertedCount: 0,
            skippedCount: 1
        });

        await handleMessage(msg);

        expect(msg.reply).toHaveBeenCalledWith('⚠️ Catatan ini sudah pernah tersimpan sebelumnya, jadi saya tidak mencatat duplikat.');
    });
    test('mengirim magic link ketika user meminta dashboard', async () => {
        const msg = createMessage('akses dashboard');

        await handleMessage(msg);

        expect(authLinkService.requestAuthLink).toHaveBeenCalledWith({
            whatsappNumber: '628123',
            purpose: 'login_web',
            redirectTo: '/dashboard'
        });
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('https://supabase.test/magic'));
        expect(dbService.appendTransactions).not.toHaveBeenCalled();
    });
});
