const TRANSACTION_TYPES = ['pengeluaran', 'pemasukan'];

const EXPENSE_CATEGORIES = [
    'makan',
    'transport',
    'belanja',
    'hiburan',
    'tagihan',
    'kesehatan',
    'pendidikan',
    'lainnya'
];

const INCOME_CATEGORIES = [
    'gaji',
    'freelance',
    'bisnis',
    'transfer_masuk',
    'investasi',
    'lainnya_masuk'
];

const DEFAULT_TRANSACTION_CATEGORY = 'lainnya';
const DEFAULT_TRANSACTION_TYPE = 'pengeluaran';

const TRANSACTION_FIELDS = {
    database: [
        'id',
        'user_id',
        'item',
        'harga',
        'kategori',
        'lokasi',
        'catatan_asli',
        'tanggal',
        'tipe',
        'created_at'
    ],
    input: [
        'item',
        'harga',
        'kategori',
        'lokasi',
        'rawText',
        'tipe',
        'whatsappNumber',
        'userId'
    ]
};

function isValidTransactionType(value) {
    return TRANSACTION_TYPES.includes(String(value || '').trim().toLowerCase());
}

function isValidTransactionCategory(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return EXPENSE_CATEGORIES.includes(normalized) || INCOME_CATEGORIES.includes(normalized);
}

module.exports = {
    TRANSACTION_TYPES,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    DEFAULT_TRANSACTION_CATEGORY,
    DEFAULT_TRANSACTION_TYPE,
    TRANSACTION_FIELDS,
    isValidTransactionType,
    isValidTransactionCategory
};
