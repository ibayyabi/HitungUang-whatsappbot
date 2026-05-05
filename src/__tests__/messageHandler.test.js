jest.mock('../services/aiParser', () => ({
    parseExpense: jest.fn(),
    parseImage: jest.fn(),
    parseAudio: jest.fn(),
    model: { generateContent: jest.fn() }
}));

jest.mock('../services/dbService', () => ({
    getUserByTelegramId: jest.fn(),
    appendTransactions: jest.fn(),
    getTotalExpensesThisMonth: jest.fn(),
    getMonthlyAllocationSummary: jest.fn(),
    updateLastAlertMonth: jest.fn(),
    listActiveWallets: jest.fn(),
    findWalletByNameExact: jest.fn(),
    findWalletByName: jest.fn(),
    incrementWalletBalance: jest.fn(),
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

function createMessage(text, overrides = {}) {
    return {
        text,
        hasMedia: false,
        mediaType: 'text',
        senderId: '12345',
        chatId: '12345',
        chatType: 'private',
        displayName: 'Ikhbar',
        username: 'ikhbar',
        reply: jest.fn().mockResolvedValue(),
        ...overrides
    };
}

describe('handleMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        dbService.getUserByTelegramId.mockResolvedValue({ id: 'user-1', display_name: 'Ikhbar' });
        dbService.appendTransactions.mockResolvedValue({ success: true, insertedCount: 1 });
        dbService.getTotalExpensesThisMonth.mockResolvedValue(0);
        dbService.getMonthlyAllocationSummary.mockResolvedValue({
            monthIncome: 1000000,
            monthExpense: 0,
            monthSavings: 0,
            availableMoney: 1000000
        });
        dbService.updateLastAlertMonth.mockResolvedValue(true);
        dbService.listActiveWallets.mockResolvedValue([]);
        dbService.findWalletByNameExact.mockResolvedValue(null);
        dbService.findWalletByName.mockResolvedValue(null);
        dbService.incrementWalletBalance.mockResolvedValue(true);
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
        expect(dbService.appendTransactions).toHaveBeenCalledWith([expect.objectContaining({
            telegramUserId: '12345',
            userId: 'user-1'
        })]);
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Berhasil Dicatat'));
    });

    test('mengarahkan pertanyaan summary ke service NL2SQL', async () => {
        const msg = createMessage('Total pengeluaran bulan ini berapa?');
        nl2sqlService.processNLQuery.mockResolvedValue('ringkasan');

        await handleMessage(msg);

        expect(nl2sqlService.processNLQuery).toHaveBeenCalledWith(msg, '12345', { id: 'user-1', display_name: 'Ikhbar' });
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
        const msg = createMessage('/dashboard');

        await handleMessage(msg);

        expect(authLinkService.requestAuthLink).toHaveBeenCalledWith({
            telegramUserId: '12345',
            purpose: 'login_web',
            redirectTo: '/dashboard'
        });
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('https://supabase.test/magic'));
        expect(dbService.appendTransactions).not.toHaveBeenCalled();
    });

    test('mengirim link register untuk Telegram user belum terdaftar', async () => {
        dbService.getUserByTelegramId.mockResolvedValue(null);
        const msg = createMessage('/start');

        await handleMessage(msg);

        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('/register?telegram_user_id=12345'));
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('chat_id=12345'));
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('username=ikhbar'));
    });

    test('memproses photo Telegram dengan parseImage', async () => {
        const msg = createMessage('struk', {
            hasMedia: true,
            mediaType: 'image',
            downloadMedia: jest.fn().mockResolvedValue({
                mimetype: 'image/jpeg',
                data: Buffer.from('image').toString('base64')
            })
        });
        aiParser.parseImage.mockResolvedValue({
            item: 'Kopi',
            harga: 20000,
            kategori: 'makan',
            tipe: 'pengeluaran'
        });

        await handleMessage(msg);

        expect(aiParser.parseImage).toHaveBeenCalledWith(expect.objectContaining({
            mimetype: 'image/jpeg'
        }));
        expect(dbService.appendTransactions).toHaveBeenCalledTimes(1);
    });

    test('mengirim alert ketika pengeluaran mencapai ambang 80 persen', async () => {
        dbService.getUserByTelegramId.mockResolvedValue({
            id: 'user-1',
            display_name: 'Ikhbar',
            target_pengeluaran_bulanan: 1000000,
            last_alert_month: null
        });
        dbService.appendTransactions.mockResolvedValue({
            success: true,
            insertedCount: 1,
            insertedTransactions: [{
                item: 'Laptop',
                harga: 800000,
                kategori: 'belanja',
                tipe: 'pengeluaran'
            }]
        });
        dbService.getTotalExpensesThisMonth.mockResolvedValue(800000);
        const msg = createMessage('Laptop 800rb');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Laptop',
            harga: 800000,
            kategori: 'belanja',
            tipe: 'pengeluaran'
        });

        await handleMessage(msg);

        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Berhasil Dicatat'));
        expect(dbService.getTotalExpensesThisMonth).toHaveBeenCalled();
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Warning'));
        expect(dbService.updateLastAlertMonth).toHaveBeenCalled();
    });

    test('tidak menjalankan alert untuk pemasukan', async () => {
        dbService.getUserByTelegramId.mockResolvedValue({
            id: 'user-1',
            display_name: 'Ikhbar',
            target_pengeluaran_bulanan: 1000000,
            last_alert_month: null
        });
        dbService.appendTransactions.mockResolvedValue({
            success: true,
            insertedCount: 1,
            insertedTransactions: [{
                item: 'Gaji',
                harga: 5000000,
                kategori: 'gaji',
                tipe: 'pemasukan'
            }]
        });
        const msg = createMessage('Gaji 5jt');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Gaji',
            harga: 5000000,
            kategori: 'gaji',
            tipe: 'pemasukan'
        });

        await handleMessage(msg);

        expect(dbService.getTotalExpensesThisMonth).not.toHaveBeenCalled();
    });

    test('auto memilih dompet ketika user hanya punya satu dompet', async () => {
        dbService.listActiveWallets.mockResolvedValue([{
            id: 'wallet-1',
            nama_dompet: 'Dana Darurat'
        }]);
        dbService.appendTransactions.mockImplementation(async (transactions) => ({
            success: true,
            insertedCount: transactions.length,
            insertedTransactions: transactions
        }));
        const msg = createMessage('Nabung 100rb');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Nabung',
            harga: 100000,
            kategori: 'tabungan',
            tipe: 'tabungan'
        });

        await handleMessage(msg);

        expect(dbService.appendTransactions).toHaveBeenCalledWith([expect.objectContaining({
            wallet_id: 'wallet-1'
        })]);
        expect(dbService.incrementWalletBalance).toHaveBeenCalledWith('wallet-1', 'user-1', 100000);
        expect(dbService.getTotalExpensesThisMonth).not.toHaveBeenCalled();
    });

    test('menolak tabungan ketika available money tidak cukup', async () => {
        dbService.listActiveWallets.mockResolvedValue([{
            id: 'wallet-1',
            nama_dompet: 'Dana Darurat'
        }]);
        dbService.getMonthlyAllocationSummary.mockResolvedValue({
            monthIncome: 100000,
            monthExpense: 50000,
            monthSavings: 25000,
            availableMoney: 25000
        });
        const msg = createMessage('Nabung 100rb');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Nabung',
            harga: 100000,
            kategori: 'tabungan',
            tipe: 'tabungan'
        });

        await handleMessage(msg);

        expect(dbService.appendTransactions).not.toHaveBeenCalled();
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Available money bulan ini belum cukup'));
    });

    test('meminta nama dompet ketika user punya beberapa dompet', async () => {
        dbService.listActiveWallets.mockResolvedValue([
            { id: 'wallet-1', nama_dompet: 'Dana Darurat' },
            { id: 'wallet-2', nama_dompet: 'Liburan' }
        ]);
        const msg = createMessage('Nabung 100rb');
        aiParser.parseExpense.mockResolvedValue({
            item: 'Nabung',
            harga: 100000,
            kategori: 'tabungan',
            tipe: 'tabungan'
        });

        await handleMessage(msg);

        expect(dbService.appendTransactions).not.toHaveBeenCalled();
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('beberapa dompet'));
    });

    test('memproses voice Telegram dengan parseAudio', async () => {
        const msg = createMessage('', {
            hasMedia: true,
            mediaType: 'voice',
            downloadMedia: jest.fn().mockResolvedValue({
                mimetype: 'audio/ogg',
                data: Buffer.from('audio').toString('base64')
            })
        });
        aiParser.parseAudio.mockResolvedValue({
            item: 'Bakso',
            harga: 15000,
            kategori: 'makan',
            tipe: 'pengeluaran'
        });

        await handleMessage(msg);

        expect(aiParser.parseAudio).toHaveBeenCalledWith(expect.objectContaining({
            mimetype: 'audio/ogg'
        }));
        expect(dbService.appendTransactions).toHaveBeenCalledTimes(1);
    });

    test('mengabaikan pesan group', async () => {
        const msg = createMessage('Bakso 15rb', {
            chatType: 'group'
        });

        await handleMessage(msg);

        expect(dbService.getUserByTelegramId).not.toHaveBeenCalled();
        expect(dbService.appendTransactions).not.toHaveBeenCalled();
        expect(msg.reply).not.toHaveBeenCalled();
    });
});
