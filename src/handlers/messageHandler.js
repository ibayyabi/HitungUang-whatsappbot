const aiParser = require('../services/aiParser');
const dbService = require('../services/dbService');
const nl2sqlService = require('../services/nl2sqlService');
const logger = require('../utils/logger');

/**
 * Fungsi utama untuk memproses pesan masuk
 */
async function handleMessage(msg) {
    const text = (msg.body || '').trim().toLowerCase();

    // Ambil nomor telepon asli (hindari LID/ID unik WhatsApp)
    const contact = await msg.getContact();
    const sender = contact.number; // Ini akan menghasilkan '628xxx' bukan LID

    try {
        // A. WAJIB CEK REGISTRASI (LOCK FIRST)
        logger.info(`Memeriksa registrasi untuk nomor: ${sender}`);
        const user = await dbService.getUserByWhatsapp(sender);

        if (!user) {
            logger.warn(`Nomor ${sender} mencoba akses tapi belum terdaftar.`);
            const welcomeText = `Halo! 👋 Saya *HitungUang Bot*.\n\n` +
                `Sepertinya nomor WhatsApp Anda belum terdaftar di sistem kami. Untuk mulai menggunakan fitur catat otomatis dan dashboard AI, silakan daftar di link berikut:\n\n` +
                `🔗 ${process.env.WEB_APP_URL || 'http://localhost:3000'}/register?whatsapp=${sender}\n\n` +
                `Setelah mendaftar, Anda bisa langsung kirim catatan belanja di sini!`;

            return await msg.reply(welcomeText);
        }

        // B. Filter dasar: Apakah ini pertanyaan, transaksi teks, atau media?
        const isQuestion = !msg.hasMedia && (
            text.includes('?') ||
            ['apa', 'berapa', 'mana', 'kapan', 'tampilkan', 'summary', 'rekap', 'total'].some(kw => text.startsWith(kw)) ||
            ['minggu ini', 'bulan ini', 'hari ini'].some(kw => text.includes(kw))
        );

        const amountRegex = /\d+/;
        const isTransactionText = amountRegex.test(text);
        const hasMedia = msg.hasMedia;

        if (!isQuestion && !isTransactionText && !hasMedia) {
            return; // Pesan biasa diabaikan untuk user terdaftar
        }

        // C. Proses NL Query
        if (isQuestion) {
            logger.info(`Memproses NL Query dari ${sender}: "${text}"`);
            const response = await nl2sqlService.processNLQuery(msg, sender);
            return await msg.reply(response);
        }

        // D. Proses Transaksi (Teks, Gambar, atau Audio)
        if (isTransactionText || hasMedia) {
            let parsedData;
            let rawTextForDb = text;

            if (hasMedia) {
                logger.info(`Mendownload media dari ${sender} (${msg.type})...`);
                const media = await msg.downloadMedia();

                // Validasi Ukuran (Maks 5MB)
                const fileSizeMB = (media.data.length * 3) / 4 / 1024 / 1024;
                if (fileSizeMB > 5) {
                    return await msg.reply('⚠️ Ukuran file terlalu besar (Maks 5MB).');
                }

                if (msg.type === 'image') {
                    // Validasi MIME Type Image
                    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
                    if (!allowedImageMimes.includes(media.mimetype)) {
                        return await msg.reply('⚠️ Format gambar tidak didukung. Kirim JPG, PNG, atau WebP.');
                    }

                    logger.info(`Memproses OCR Gambar dari ${sender}`);
                    parsedData = await aiParser.parseImage(media);
                    rawTextForDb = `[Kirim Gambar] ${text}`;
                } else if (msg.type === 'audio' || msg.type === 'ptt') {
                    logger.info(`Memproses Voice Note dari ${sender}`);
                    parsedData = await aiParser.parseAudio(media);
                    rawTextForDb = `[Voice Note]`;
                } else {
                    return await msg.reply('⚠️ Format media tidak didukung.');
                }
            } else {
                logger.info(`Mencatat transaksi teks dari ${sender}: "${text}"`);
                parsedData = await aiParser.parseExpense(text);
            }

            const items = Array.isArray(parsedData) ? parsedData : [parsedData];

            if (items.length === 0 || !items[0].item) {
                throw new Error('Data tidak valid setelah di-parse AI');
            }

            let confirmationText = '✅ *Berhasil Dicatat!* \n\n';
            let totalPengeluaran = 0;
            let totalPemasukan = 0;

            for (const item of items) {
                await dbService.appendTransaction({
                    ...item,
                    rawText: rawTextForDb,
                    whatsappNumber: sender
                });

                const emoji = item.tipe === 'pemasukan' ? '💰' : '💸';
                const tipeLabel = item.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';

                confirmationText += `${emoji} *${tipeLabel}*: ${item.item} - Rp ${item.harga.toLocaleString('id-ID')}\n`;

                if (item.tipe === 'pemasukan') {
                    totalPemasukan += item.harga;
                } else {
                    totalPengeluaran += item.harga;
                }
            }

            if (items.length > 1) {
                if (totalPemasukan > 0) confirmationText += `\n*Total Pemasukan:* Rp ${totalPemasukan.toLocaleString('id-ID')}`;
                if (totalPengeluaran > 0) confirmationText += `\n*Total Pengeluaran:* Rp ${totalPengeluaran.toLocaleString('id-ID')}`;
            }

            await msg.reply(confirmationText);
            logger.info(`Berhasil mencatat ${items.length} item ke Supabase untuk ${sender}`);
        }

    } catch (error) {
        logger.error(`Gagal memproses pesan: ${error.message}`);
        await msg.reply('Maaf, saya gagal memahami atau mencatat pesan tersebut. Pastikan formatnya jelas (contoh: "Bakso 15rb").');
    }
}

module.exports = { handleMessage };
