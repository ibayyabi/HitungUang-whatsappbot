const aiParser = require('./aiParser');
const dbService = require('./dbService');
const logger = require('../utils/logger');
const { sanitizeInput } = require('../utils/sanitizer');

/**
 * Validasi apakah SQL yang dihasilkan AI aman
 */
function validateSQL(sql, userId) {
    const s = sql.toLowerCase();

    // 1. Wajib SELECT
    if (!s.startsWith('select')) return false;

    const forbidden = ['drop', 'delete', 'update', 'insert', 'truncate', 'alter', 'create', 'grant', 'revoke'];
    if (forbidden.some(word => s.includes(word))) return false;

    // 3. Harus mengandung filter user_id yang tepat
    if (!s.includes(`user_id = '${userId}'`) && !s.includes(`user_id='${userId}'`)) return false;

    // 4. Batasi hanya ke tabel transactions
    if (!s.includes('from transactions')) return false;

    return true;
}

/**
 * Service untuk memproses pertanyaan human language menjadi SQL (NL2SQL)
 */
async function processNLQuery(message, whatsappNumber) {
    const text = message.body;

    try {
        const user = await dbService.getUserByWhatsapp(whatsappNumber);
        const userId = user ? user.id : null;

        if (!userId) {
            return "⚠️ Maaf, akun WhatsApp Anda belum terdaftar di Web App. Silakan daftar terlebih dahulu untuk menggunakan fitur tanya jawab.";
        }

        const cleanText = sanitizeInput(text);
        const prompt = `
Kamu adalah asisten keuangan cerdas. Tugasmu adalah mengubah pertanyaan user menjadi SQL query PostgreSQL yang VALID berdasarkan schema tabel yang diberikan.

SCHEMA TABEL 'transactions':
- id (uuid)
- user_id (uuid) -> id dari user yang bertanya
- item (text) -> nama barang/jasa/pemasukan
- harga (integer) -> nominal dlm Rupiah
- kategori (text)
- lokasi (text)
- catatan_asli (text)
- tanggal (timestamptz)
- tipe (text) -> 'pengeluaran' atau 'pemasukan'

ATURAN:
1. Output HANYA JSON dengan format: {"sql": "SELECT ...", "explanation": "Penjelasan singkat dalam Bahasa Indonesia"}
2. Gunakan filter 'user_id = '${userId}'' di setiap query.
3. Untuk waktu: Hari ini (CURRENT_DATE), Minggu ini (date_trunc('week', CURRENT_DATE)), Bulan ini (date_trunc('month', CURRENT_DATE)).
4. Pastikan nominal harga dijumlahkan (SUM) jika ditanya 'total' atau 'berapa'.

Pertanyaan User: "${cleanText}"
        `;

        const aiResponse = await aiParser.model.generateContent(prompt);
        const resultText = aiResponse.response.text().replace(/```json|```/g, '').trim();
        const { sql, explanation } = JSON.parse(resultText);

        logger.info(`Generated SQL for ${whatsappNumber}: ${sql}`);

        // VALIDASI SQL SEBELUM LANJUT
        if (!validateSQL(sql, userId)) {
            logger.error(`SQL Injection Attempt or Invalid SQL from AI: ${sql}`);
            return "⚠️ Maaf, saya tidak bisa memproses pertanyaan tersebut demi alasan keamanan.";
        }

        if (sql.toLowerCase().includes('sum(harga)')) {
            const { data, error } = await dbService.supabase
                .from('transactions')
                .select('harga.sum()')
                .eq('user_id', userId)
                .gte('tanggal', sql.includes('month') ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() : new Date().toISOString().split('T')[0]);

        }

        return `📊 *Hasil Analisa AI*:\n\n${explanation}\n\nUntuk detail lengkap dan grafik, cek dashboard Anda di: ${process.env.WEB_APP_URL}`;

    } catch (error) {
        logger.error(`Error NL2SQL: ${error.message}`);
        return "❌ Maaf, saya sedang kesulitan menganalisa data Anda. Coba tanyakan dengan cara lain atau cek dashboard.";
    }
}

module.exports = { processNLQuery };
