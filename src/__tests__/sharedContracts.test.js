const {
    AUTH_REQUEST_FIELDS,
    AUTH_TOKEN_PURPOSES,
    AUTH_VERIFY_FIELDS,
    TRANSACTION_TYPES,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    PROFILE_FIELDS,
    TRANSACTION_FIELDS,
    isValidTransactionType,
    isValidTransactionCategory,
    isValidAuthPurpose
} = require('../../shared/contracts');

describe('shared contracts', () => {
    test('menyediakan enum tipe transaksi yang valid', () => {
        expect(TRANSACTION_TYPES).toEqual(['pengeluaran', 'pemasukan', 'tabungan']);
        expect(isValidTransactionType('PENGELUARAN')).toBe(true);
        expect(isValidTransactionType('tabungan')).toBe(true);
        expect(isValidTransactionType('refund')).toBe(false);
    });

    test('menyediakan kategori transaksi yang dipakai bot', () => {
        expect(EXPENSE_CATEGORIES).toContain('makan');
        expect(INCOME_CATEGORIES).toContain('gaji');
        expect(isValidTransactionCategory('transport')).toBe(true);
        expect(isValidTransactionCategory('unknown')).toBe(false);
    });

    test('mendefinisikan field profile dan transaction untuk referensi lintas app', () => {
        expect(PROFILE_FIELDS).toEqual([
            'id',
            'telegram_user_id',
            'telegram_chat_id',
            'telegram_username',
            'display_name',
            'status_pekerjaan',
            'target_pengeluaran_bulanan',
            'target_pemasukan_bulanan',
            'last_alert_month',
            'created_at'
        ]);
        expect(TRANSACTION_FIELDS.database).toContain('catatan_asli');
        expect(TRANSACTION_FIELDS.input).toContain('telegramUserId');
    });

    test('mendefinisikan kontrak auth untuk magic link', () => {
        expect(AUTH_TOKEN_PURPOSES).toEqual(['login_web', 'summary_link']);
        expect(AUTH_REQUEST_FIELDS).toContain('telegram_user_id');
        expect(AUTH_VERIFY_FIELDS).toContain('token');
        expect(isValidAuthPurpose('login_web')).toBe(true);
        expect(isValidAuthPurpose('dashboard')).toBe(false);
    });
});
