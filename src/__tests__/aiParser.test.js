process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({
        getGenerativeModel: jest.fn(() => ({
            generateContent: mockGenerateContent
        }))
    }))
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const aiParser = require('../services/aiParser');
const {
    clearParseCache,
    extractJsonPayload,
    normalizeParsedExpense,
    parseSimpleTransaction
} = aiParser;

describe('aiParser helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearParseCache();
    });

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

    test('menormalkan harga string dengan satuan miliyar', () => {
        const result = normalizeParsedExpense({
            item: 'Bonus Investasi',
            harga: '2 miliyar',
            kategori: 'investasi',
            tipe: 'pemasukan'
        });

        expect(result.harga).toBe(2000000000);
    });

    test('parse deterministik transaksi teks sederhana tanpa LLM', async () => {
        const result = await aiParser.parseExpense('Bakso 15rb');

        expect(result).toEqual({
            item: 'Bakso',
            harga: 15000,
            kategori: 'makan',
            lokasi: null,
            tipe: 'pengeluaran'
        });
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    test('parse deterministik pemasukan dan nominal juta', () => {
        const result = parseSimpleTransaction('Gaji bulan ini cair 5 juta');

        expect(result).toEqual({
            item: 'Gaji Bulan Ini',
            harga: 5000000,
            kategori: 'gaji',
            lokasi: null,
            tipe: 'pemasukan'
        });
    });

    test('meng-cache fallback LLM untuk input yang sama', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => '{"item":"Bensin dan Parkir","harga":30000,"kategori":"transport","tipe":"pengeluaran"}'
            }
        });

        const first = await aiParser.parseExpense('Bensin 20rb dan parkir 10rb');
        const second = await aiParser.parseExpense('Bensin 20rb dan parkir 10rb');

        expect(first).toEqual(second);
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
});
