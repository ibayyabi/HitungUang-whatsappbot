jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({}))
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const { splitNewTransactions, createTransactionSignature } = require('../services/dbService');

describe('dbService idempotency helpers', () => {
    test('membuat signature transaksi yang stabil walau beda casing', () => {
        const first = createTransactionSignature({
            item: 'Bensin Mobil',
            harga: 150000,
            kategori: 'transport',
            lokasi: 'SPBU',
            tipe: 'pengeluaran',
            rawText: 'Bensin mobil 150rb'
        });

        const second = createTransactionSignature({
            item: '  bensin mobil ',
            harga: '150000',
            kategori: 'Transport',
            lokasi: 'spbu',
            tipe: 'PENGELUARAN',
            catatan_asli: 'bensin mobil 150rb'
        });

        expect(first).toBe(second);
    });

    test('hanya menyisakan item yang belum pernah tersimpan', () => {
        const payload = [
            {
                item: 'Bensin Mobil',
                harga: 150000,
                kategori: 'transport',
                lokasi: 'SPBU',
                tipe: 'pengeluaran',
                catatan_asli: 'Bensin mobil 150rb, kopi 20rb'
            },
            {
                item: 'Kopi',
                harga: 20000,
                kategori: 'makan',
                lokasi: null,
                tipe: 'pengeluaran',
                catatan_asli: 'Bensin mobil 150rb, kopi 20rb'
            }
        ];

        const existingRows = [
            {
                item: 'bensin mobil',
                harga: 150000,
                kategori: 'transport',
                lokasi: 'spbu',
                tipe: 'pengeluaran',
                catatan_asli: 'Bensin mobil 150rb, kopi 20rb'
            }
        ];

        const result = splitNewTransactions(payload, existingRows);

        expect(result.skippedCount).toBe(1);
        expect(result.newTransactions).toHaveLength(1);
        expect(result.newTransactions[0].item).toBe('Kopi');
    });
});
