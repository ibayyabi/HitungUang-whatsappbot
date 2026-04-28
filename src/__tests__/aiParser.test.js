process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({
        getGenerativeModel: jest.fn(() => ({
            generateContent: jest.fn()
        }))
    }))
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const { extractJsonPayload, normalizeParsedExpense } = require('../services/aiParser');

describe('aiParser helpers', () => {
    test('mengekstrak JSON meski model menambahkan kalimat pembuka', () => {
        const payload = extractJsonPayload('Berikut hasilnya:\n{"item":"Kopi","harga":18000,"tipe":"pengeluaran"}');
        expect(payload).toBe('{"item":"Kopi","harga":18000,"tipe":"pengeluaran"}');
    });

    test('mengekstrak JSON array dari response berpagar markdown', () => {
        const payload = extractJsonPayload('```json\n[{"item":"Kopi","harga":18000,"tipe":"pengeluaran"}]\n```');
        expect(payload).toBe('[{"item":"Kopi","harga":18000,"tipe":"pengeluaran"}]');
    });

    test('menormalkan objek transaksi valid', () => {
        const result = normalizeParsedExpense({
            item: '  Kopi Susu ',
            harga: '18000',
            kategori: '',
            lokasi: '  Kantor ',
            tipe: 'PENGELUARAN'
        });

        expect(result).toEqual({
            item: 'Kopi Susu',
            harga: 18000,
            kategori: 'lainnya',
            lokasi: 'Kantor',
            tipe: 'pengeluaran'
        });
    });

    test('menolak hasil parse tanpa nominal valid', () => {
        expect(() => normalizeParsedExpense({
            item: 'Kopi',
            harga: 'abc',
            tipe: 'pengeluaran'
        })).toThrow('AI transaction item has invalid amount');
    });
});
