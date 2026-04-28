jest.mock('../services/aiParser', () => ({
    model: { generateContent: jest.fn() }
}));

jest.mock('../services/dbService', () => ({
    getUserByWhatsapp: jest.fn(),
    supabase: {}
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const { buildQueryPlan, formatDataResponse, validateSQL } = require('../services/nl2sqlService');

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
});
