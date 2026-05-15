const aiParser = require('./aiParser');
const dbService = require('./dbService');
const logger = require('../utils/logger');
const llmService = require('../utils/llmService');
const { sanitizeInput } = require('../utils/sanitizer');
const {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    SAVING_CATEGORIES
} = require('../../shared/contracts');

const BASE_SELECT = 'id,item,harga,kategori,lokasi,catatan_asli,tanggal,tipe';
const MAX_ROWS = 50;
const AGGREGATE_MAX_ROWS = 1000;

const QUERY_CATEGORY_KEYWORDS = [
    { kategori: 'makan', keywords: ['makan', 'makanan', 'jajan', 'kopi', 'ngopi', 'bakso', 'nasi'] },
    { kategori: 'transport', keywords: ['transport', 'bensin', 'parkir', 'tol', 'ojek', 'gojek', 'grab', 'taxi', 'taksi'] },
    { kategori: 'belanja', keywords: ['belanja', 'beli', 'shopping', 'shopee', 'tokopedia', 'alfamart', 'indomaret'] },
    { kategori: 'hiburan', keywords: ['hiburan', 'nonton', 'bioskop', 'game', 'netflix', 'spotify'] },
    { kategori: 'tagihan', keywords: ['tagihan', 'listrik', 'air', 'wifi', 'internet', 'pulsa', 'token', 'cicilan', 'sewa'] },
    { kategori: 'kesehatan', keywords: ['kesehatan', 'obat', 'dokter', 'klinik', 'rumah sakit'] },
    { kategori: 'pendidikan', keywords: ['pendidikan', 'sekolah', 'kuliah', 'buku', 'kursus'] },
    { kategori: 'gaji', keywords: ['gaji', 'salary'] },
    { kategori: 'freelance', keywords: ['freelance', 'freelancer'] },
    { kategori: 'bisnis', keywords: ['bisnis', 'jualan', 'usaha'] },
    { kategori: 'transfer_masuk', keywords: ['transfer masuk', 'transfer dari', 'ditransfer', 'tf dari'] },
    { kategori: 'investasi', keywords: ['investasi', 'dividen', 'saham', 'crypto'] },
    { kategori: 'tabungan', keywords: ['tabungan', 'nabung'] }
];

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function includesAny(text, keywords) {
    return keywords.some((keyword) => text.includes(keyword));
}

function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek() {
    const today = startOfToday();
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    today.setDate(today.getDate() - diff);
    return today;
}

function startOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function buildTextTimeRange(normalizedText) {
    if (/\b(hari ini|today)\b/.test(normalizedText)) {
        return { label: 'hari ini', startDate: startOfToday() };
    }

    if (/\b(minggu ini|pekan ini|week)\b/.test(normalizedText)) {
        return { label: 'minggu ini', startDate: startOfWeek() };
    }

    if (/\b(bulan ini|month)\b/.test(normalizedText)) {
        return { label: 'bulan ini', startDate: startOfMonth() };
    }

    return { label: 'seluruh periode', startDate: null };
}

function detectTextMetric(normalizedText) {
    if (/\b(jumlah transaksi|jumlah catatan|berapa kali|berapa banyak transaksi|berapa jumlah)\b/.test(normalizedText)) {
        return 'count';
    }

    if (/\b(total|berapa|rekap|ringkas|summary|habis)\b/.test(normalizedText)) {
        return 'sum';
    }

    if (/\b(tampilkan|daftar|list|riwayat|transaksi|catatan|terakhir)\b/.test(normalizedText)) {
        return 'list';
    }

    return null;
}

function detectTextType(normalizedText) {
    if (/\b(tabungan|nabung)\b/.test(normalizedText)) {
        return 'tabungan';
    }

    if (/\b(pemasukan|pendapatan|income|uang masuk|gaji|bonus|freelance|komisi|transfer masuk)\b/.test(normalizedText)) {
        return 'pemasukan';
    }

    if (/\b(pengeluaran|belanja|keluar|expense|bayar|beli)\b/.test(normalizedText)) {
        return 'pengeluaran';
    }

    return null;
}

function categoryToType(kategori) {
    if (EXPENSE_CATEGORIES.includes(kategori)) {
        return 'pengeluaran';
    }

    if (INCOME_CATEGORIES.includes(kategori)) {
        return 'pemasukan';
    }

    if (SAVING_CATEGORIES.includes(kategori)) {
        return 'tabungan';
    }

    return null;
}

function detectTextCategory(normalizedText) {
    const match = QUERY_CATEGORY_KEYWORDS.find((group) => includesAny(normalizedText, group.keywords));
    return match ? match.kategori : null;
}

function detectTextOrder(normalizedText) {
    return /\b(terlama|awal|pertama|asc)\b/.test(normalizedText) ? 'asc' : 'desc';
}

function detectTextLimit(normalizedText) {
    const explicitLimit = normalizedText.match(/\b(?:limit|terakhir|top)\s+(\d{1,3})\b/);

    if (explicitLimit) {
        return Math.min(Number.parseInt(explicitLimit[1], 10), MAX_ROWS);
    }

    const leadingLimit = normalizedText.match(/\b(?:tampilkan|daftar|list)\s+(\d{1,3})\b/);

    if (leadingLimit) {
        return Math.min(Number.parseInt(leadingLimit[1], 10), MAX_ROWS);
    }

    if (/\b(semua|all)\b/.test(normalizedText)) {
        return MAX_ROWS;
    }

    return 10;
}

function hasSupportedDeterministicIntent(normalizedText) {
    if (/\b(saldo|sisa|rata-rata|rata rata|perbandingan|bandingkan)\b/.test(normalizedText)) {
        return false;
    }

    return includesAny(normalizedText, [
        'total',
        'berapa',
        'rekap',
        'ringkas',
        'summary',
        'tampilkan',
        'daftar',
        'list',
        'riwayat',
        'transaksi',
        'catatan',
        'pengeluaran',
        'pemasukan',
        'pendapatan',
        'tabungan',
        'belanja'
    ]);
}

function buildDeterministicQueryPlan(text) {
    const normalizedText = normalizeText(text);

    if (!normalizedText || !hasSupportedDeterministicIntent(normalizedText)) {
        return null;
    }

    const kategori = detectTextCategory(normalizedText);
    const tipeFromText = detectTextType(normalizedText);
    const tipe = tipeFromText || categoryToType(kategori);
    const metric = detectTextMetric(normalizedText) || (tipe || kategori ? 'list' : null);

    if (!metric) {
        return null;
    }

    return {
        metric,
        order: detectTextOrder(normalizedText),
        limit: detectTextLimit(normalizedText),
        timeRange: buildTextTimeRange(normalizedText),
        tipe,
        kategori,
        itemSearch: null
    };
}

function validateSQL(sql, userId) {
    if (!sql || typeof sql !== 'string') {
        return false;
    }

    const compact = sql.replace(/\s+/g, ' ').trim();
    const lowered = compact.toLowerCase();
    const userPattern = new RegExp(`user_id\\s*=\\s*'${escapeRegExp(userId)}'`, 'i');
    const forbidden = ['drop', 'delete', 'update', 'insert', 'truncate', 'alter', 'create', 'grant', 'revoke', '--', ';'];

    if (!lowered.startsWith('select ')) return false;
    if (!lowered.includes(' from transactions')) return false;
    if (!userPattern.test(compact)) return false;
    if (forbidden.some((word) => lowered.includes(word))) return false;

    return true;
}

function detectTimeRange(sql) {
    const lowered = sql.toLowerCase();

    if (lowered.includes("date_trunc('month', current_date)") || lowered.includes("date_trunc('month', now())")) {
        return { label: 'bulan ini', startDate: startOfMonth() };
    }

    if (lowered.includes("date_trunc('week', current_date)") || lowered.includes("date_trunc('week', now())")) {
        return { label: 'minggu ini', startDate: startOfWeek() };
    }

    if (lowered.includes('current_date')) {
        return { label: 'hari ini', startDate: startOfToday() };
    }

    return { label: 'seluruh periode', startDate: null };
}

function detectMetric(sql) {
    const lowered = sql.toLowerCase();

    if (lowered.includes('sum(harga)')) {
        return 'sum';
    }

    if (lowered.includes('count(')) {
        return 'count';
    }

    return 'list';
}

function detectOrder(sql) {
    return sql.toLowerCase().includes('order by tanggal asc') ? 'asc' : 'desc';
}

function detectLimit(sql) {
    const match = sql.match(/limit\s+(\d+)/i);

    if (!match) {
        return 10;
    }

    return Math.min(Number.parseInt(match[1], 10), MAX_ROWS);
}

function extractEqualityFilter(sql, field) {
    const regex = new RegExp(`${field}\\s*=\\s*'([^']+)'`, 'i');
    const match = sql.match(regex);
    return match ? match[1] : null;
}

function extractItemSearch(sql) {
    const ilikeMatch = sql.match(/item\s+ilike\s+'%([^']+)%'/i);
    if (ilikeMatch) {
        return ilikeMatch[1];
    }

    const likeMatch = sql.match(/item\s+like\s+'%([^']+)%'/i);
    return likeMatch ? likeMatch[1] : null;
}

function buildQueryPlan(sql) {
    return {
        metric: detectMetric(sql),
        order: detectOrder(sql),
        limit: detectLimit(sql),
        timeRange: detectTimeRange(sql),
        tipe: extractEqualityFilter(sql, 'tipe'),
        kategori: extractEqualityFilter(sql, 'kategori'),
        itemSearch: extractItemSearch(sql)
    };
}

async function fetchTransactions(userId, plan) {
    let query = dbService.supabase
        .from('transactions')
        .select(BASE_SELECT)
        .eq('user_id', userId);

    if (plan.tipe) {
        query = query.eq('tipe', plan.tipe);
    }

    if (plan.kategori) {
        query = query.eq('kategori', plan.kategori);
    }

    if (plan.itemSearch) {
        query = query.ilike('item', `%${plan.itemSearch}%`);
    }

    if (plan.timeRange.startDate) {
        query = query.gte('tanggal', plan.timeRange.startDate.toISOString());
    }

    const queryLimit = plan.metric === 'list' ? plan.limit : AGGREGATE_MAX_ROWS;
    const { data, error } = await query.order('tanggal', { ascending: plan.order === 'asc' }).limit(queryLimit);

    if (error) {
        throw error;
    }

    return data || [];
}

function formatCurrency(amount) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(new Date(date));
}

function formatDataResponse(rows, plan) {
    if (rows.length === 0) {
        return `📊 *Hasil Analisa*:\n\nTidak ada data transaksi untuk ${plan.timeRange.label}.`;
    }

    if (plan.metric === 'sum') {
        const total = rows.reduce((sum, row) => sum + Number(row.harga || 0), 0);
        const tipeLabel = plan.tipe ? ` ${plan.tipe}` : '';

        return `📊 *Hasil Analisa*:\n\nTotal${tipeLabel} ${plan.timeRange.label}: *${formatCurrency(total)}* dari ${rows.length} transaksi.`;
    }

    if (plan.metric === 'count') {
        return `📊 *Hasil Analisa*:\n\nJumlah transaksi ${plan.timeRange.label}: *${rows.length}* catatan.`;
    }

    const lines = rows.slice(0, 10).map((row) => {
        const icon = row.tipe === 'pemasukan' ? '💰' : '💸';
        return `${icon} ${formatDate(row.tanggal)} - ${row.item}: ${formatCurrency(row.harga)}`;
    });

    const suffix = rows.length > 10 ? `\n\nMenampilkan 10 dari ${rows.length} transaksi.` : '';
    return `📊 *Hasil Analisa*:\n\n${lines.join('\n')}${suffix}`;
}

async function generateSQL(cleanText, userId) {
    const prompt = `
Kamu adalah generator SQL PostgreSQL untuk aplikasi keuangan pribadi.

SCHEMA TABEL transactions:
- id (uuid)
- user_id (uuid)
- item (text)
- harga (integer)
- kategori (text)
- lokasi (text)
- catatan_asli (text)
- tanggal (timestamptz)
- tipe (text) -> 'pengeluaran' atau 'pemasukan'

ATURAN KERAS:
1. Output HANYA JSON valid dengan format {"sql":"SELECT ..."}.
2. Query harus selalu SELECT dari tabel transactions.
3. Query harus selalu mengandung filter user_id = '${userId}'.
4. Jika user menanyakan total, gunakan SUM(harga).
5. Jika user menanyakan jumlah catatan, gunakan COUNT(*).
6. Untuk daftar transaksi, gunakan ORDER BY tanggal DESC dan LIMIT maksimal 50.
7. Untuk waktu gunakan CURRENT_DATE atau date_trunc('week'/'month', CURRENT_DATE).
8. Jangan tambahkan komentar SQL, markdown, atau teks penjelasan.

Pertanyaan user: "${cleanText}"
    `;

    const { result, modelName } = await llmService.generateContentWithFallback(prompt, {
        maxOutputTokens: 256
    });

    logger.info(`LLM NL query called: reason=nl2sql_fallback model=${modelName} llm_called=true`);
    const resultText = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(resultText);
    return parsed.sql;
}

/**
 * Service untuk memproses pertanyaan human language menjadi SQL (NL2SQL)
 */
async function processNLQuery(message, telegramUserId, user) {
    const text = message.text || message.body || '';

    try {
        const registeredUser = user || await dbService.getUserByTelegramId(telegramUserId);
        const userId = registeredUser ? registeredUser.id : null;

        if (!userId) {
            return "⚠️ Maaf, akun Telegram Anda belum terdaftar di Web App. Silakan daftar terlebih dahulu untuk menggunakan fitur tanya jawab.";
        }

        const cleanText = sanitizeInput(text);
        const deterministicPlan = buildDeterministicQueryPlan(cleanText);

        if (deterministicPlan) {
            logger.info(`LLM NL query skipped: deterministic_plan user=${telegramUserId} llm_called=false`);
            const rows = await fetchTransactions(userId, deterministicPlan);
            return formatDataResponse(rows, deterministicPlan);
        }

        if (process.env.LLM_FALLBACK_ENABLED === 'false') {
            logger.warn(`LLM NL query disabled and deterministic planner could not parse query from user=${telegramUserId}`);
            return "⚠️ Maaf, saya belum bisa memproses pertanyaan tersebut. Coba format seperti: total pengeluaran bulan ini.";
        }

        let sql = await generateSQL(cleanText, userId);

        // Bersihkan semicolon di akhir agar tidak ditolak validator
        sql = sql.trim().replace(/;$/, '');

        logger.info(`Generated SQL for Telegram user ${telegramUserId}: ${sql}`);

        if (!validateSQL(sql, userId)) {
            logger.error(`Invalid SQL from AI: ${sql}`);
            return "⚠️ Maaf, saya tidak bisa memproses pertanyaan tersebut demi alasan keamanan.";
        }

        const plan = buildQueryPlan(sql);
        const rows = await fetchTransactions(userId, plan);
        return formatDataResponse(rows, plan);
    } catch (error) {
        logger.error(`Error NL2SQL: ${error.message}`);
        return "❌ Maaf, saya sedang kesulitan menganalisa data Anda. Coba tanyakan dengan cara lain atau cek dashboard.";
    }
}

module.exports = {
    processNLQuery,
    validateSQL,
    buildDeterministicQueryPlan,
    buildQueryPlan,
    formatDataResponse
};
