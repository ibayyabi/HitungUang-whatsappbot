const aiParser = require('./aiParser');
const dbService = require('./dbService');
const logger = require('../utils/logger');
const { sanitizeInput } = require('../utils/sanitizer');

const BASE_SELECT = 'id,item,harga,kategori,lokasi,catatan_asli,tanggal,tipe';
const MAX_ROWS = 50;

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const { data, error } = await query.order('tanggal', { ascending: plan.order === 'asc' }).limit(plan.limit);

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
        return `📊 *Hasil Analisa AI*:\n\nTidak ada data transaksi untuk ${plan.timeRange.label}.`;
    }

    if (plan.metric === 'sum') {
        const total = rows.reduce((sum, row) => sum + Number(row.harga || 0), 0);
        const tipeLabel = plan.tipe ? ` ${plan.tipe}` : '';

        return `📊 *Hasil Analisa AI*:\n\nTotal${tipeLabel} ${plan.timeRange.label}: *${formatCurrency(total)}* dari ${rows.length} transaksi.`;
    }

    if (plan.metric === 'count') {
        return `📊 *Hasil Analisa AI*:\n\nJumlah transaksi ${plan.timeRange.label}: *${rows.length}* catatan.`;
    }

    const lines = rows.slice(0, 10).map((row) => {
        const icon = row.tipe === 'pemasukan' ? '💰' : '💸';
        return `${icon} ${formatDate(row.tanggal)} - ${row.item}: ${formatCurrency(row.harga)}`;
    });

    const suffix = rows.length > 10 ? `\n\nMenampilkan 10 dari ${rows.length} transaksi.` : '';
    return `📊 *Hasil Analisa AI*:\n\n${lines.join('\n')}${suffix}`;
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

    const model = aiParser.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const aiResponse = await model.generateContent(prompt);
    const resultText = aiResponse.response.text().replace(/```json|```/g, '').trim();
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
    buildQueryPlan,
    formatDataResponse
};
