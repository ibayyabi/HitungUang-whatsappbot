jest.mock('../services/aiParser', () => ({
    model: { generateContent: jest.fn() }
}));

jest.mock('../services/dbService', () => ({
    getUserByTelegramId: jest.fn(),
    supabase: {}
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const {
    buildDeterministicQueryPlan,
    buildQueryPlan,
    formatDataResponse,
    validateSQL
} = require('../services/nl2sqlService');

describe('nl2sqlService', () => {
    test('memvalidasi SQL select yang aman dan terikat ke user', () => {
        const sql = "SELECT SUM(harga) FROM transactions WHERE user_id = 'user-1' AND tipe = 'pengeluaran' AND tanggal >= date_trunc('month', CURRENT_DATE)";
        expect(validateSQL(sql, 'user-1')).toBe(true);
    });

    test('menolak SQL tanpa filter user yang benar', () => {
        const sql = "SELECT * FROM transactions WHERE user_id = 'user-2'";
        expect(validateSQL(sql, 'user-1')).toBe(false);
    });

    test('membuat jawaban total dari data database nyata', () => {
        const plan = buildQueryPlan("SELECT SUM(harga) FROM transactions WHERE user_id = 'user-1' AND tipe = 'pengeluaran' AND tanggal >= date_trunc('month', CURRENT_DATE)");
        const response = formatDataResponse([
            { harga: 10000, tipe: 'pengeluaran' },
            { harga: 25000, tipe: 'pengeluaran' }
        ], plan);

        expect(response).toContain('Rp 35.000');
        expect(response).toContain('2 transaksi');
        expect(response).toContain('bulan ini');
    });

    test('membuat deterministic plan untuk total pengeluaran bulan ini', () => {
        const plan = buildDeterministicQueryPlan('Total pengeluaran bulan ini berapa?');

        expect(plan).toEqual(expect.objectContaining({
            metric: 'sum',
            tipe: 'pengeluaran',
            kategori: null,
            order: 'desc',
            limit: 10
        }));
        expect(plan.timeRange.label).toBe('bulan ini');
        expect(plan.timeRange.startDate).toBeInstanceOf(Date);
    });

    test('membuat deterministic plan untuk daftar transaksi terakhir', () => {
        const plan = buildDeterministicQueryPlan('Tampilkan 5 transaksi terakhir');

        expect(plan).toEqual(expect.objectContaining({
            metric: 'list',
            tipe: null,
            kategori: null,
            order: 'desc',
            limit: 5
        }));
    });

    test('mendeteksi kategori dan tipe dari pertanyaan umum', () => {
        const plan = buildDeterministicQueryPlan('berapa pengeluaran makan minggu ini');

        expect(plan).toEqual(expect.objectContaining({
            metric: 'sum',
            tipe: 'pengeluaran',
            kategori: 'makan'
        }));
        expect(plan.timeRange.label).toBe('minggu ini');
    });
});
