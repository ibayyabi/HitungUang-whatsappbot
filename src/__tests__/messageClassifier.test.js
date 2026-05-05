const { classifyMessage } = require('../utils/messageClassifier');

describe('messageClassifier', () => {
    test('memprioritaskan transaksi ketika frasa periode muncul bersama nominal', () => {
        const result = classifyMessage({
            text: 'Gaji bulan ini cair 5 juta',
            hasMedia: false
        });

        expect(result.mode).toBe('transaction');
        expect(result.isTransactionText).toBe(true);
        expect(result.isQuestion).toBe(false);
    });

    test('mengenali pertanyaan summary tanpa salah klasifikasi jadi transaksi', () => {
        const result = classifyMessage({
            text: 'Total pengeluaran bulan ini berapa?',
            hasMedia: false
        });

        expect(result.mode).toBe('question');
        expect(result.isQuestion).toBe(true);
        expect(result.isTransactionText).toBe(false);
    });

    test('mengabaikan chat biasa yang hanya berisi angka kecil', () => {
        const result = classifyMessage({
            text: 'Nanti jam 7 ya',
            hasMedia: false
        });

        expect(result.mode).toBe('ignore');
        expect(result.shouldProcess).toBe(false);
    });

    test('mengenali miliyar sebagai nominal transaksi', () => {
        const result = classifyMessage({
            text: 'Gaji 2 miliyar',
            hasMedia: false
        });

        expect(result.mode).toBe('transaction');
        expect(result.isTransactionText).toBe(true);
    });
});
