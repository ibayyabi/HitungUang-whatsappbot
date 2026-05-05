const {
    hasCurrencyAmount,
    normalizeCurrencyText,
    parseCurrencyAmount
} = require('../utils/currencyNormalizer');

describe('currencyNormalizer', () => {
    test.each([
        ['1 miliyar', 1000000000],
        ['2,5 miliyar', 2500000000],
        ['0.5 miliyar', 500000000],
        ['2miliyar', 2000000000],
        ['Rp 2 miliyar', 2000000000],
        ['5jt', 5000000],
        ['15rb', 15000]
    ])('mengubah %s menjadi %s', (input, expected) => {
        expect(parseCurrencyAmount(input)).toBe(expected);
    });

    test('mengenali miliyar sebagai nominal transaksi', () => {
        expect(hasCurrencyAmount('gaji 2 miliyar')).toBe(true);
    });

    test('menormalisasi teks untuk prompt AI tanpa mengubah raw intent', () => {
        expect(normalizeCurrencyText('gaji 2 miliyar')).toBe('gaji 2000000000 rupiah');
    });
});
