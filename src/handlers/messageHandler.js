const aiParser = require('../services/aiParser');
const authLinkService = require('../services/authLinkService');
const dbService = require('../services/dbService');
const nl2sqlService = require('../services/nl2sqlService');
const logger = require('../utils/logger');
const { classifyMessage } = require('../utils/messageClassifier');
const { maybeSendSpendingAlert } = require('../services/spendingAlertService');

const DASHBOARD_ACCESS_COMMANDS = new Set([
    '/dashboard',
    'dashboard',
    'login',
    'akses dashboard',
    'buka dashboard'
]);

const HELP_COMMANDS = new Set(['/help', 'help', 'bantuan']);
const START_COMMANDS = new Set(['/start', 'start']);

function isDashboardAccessCommand(text) {
    return DASHBOARD_ACCESS_COMMANDS.has(String(text || '').trim().toLowerCase());
}

function isHelpCommand(text) {
    return HELP_COMMANDS.has(String(text || '').trim().toLowerCase());
}

function isStartCommand(text) {
    return START_COMMANDS.has(String(text || '').trim().toLowerCase());
}

function buildRegisterUrl(message) {
    const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const target = new URL('/register', baseUrl);

    target.searchParams.set('telegram_user_id', message.senderId);
    target.searchParams.set('whatsapp', message.senderId);

    if (message.chatId) {
        target.searchParams.set('chat_id', message.chatId);
    }

    if (message.username) {
        target.searchParams.set('username', message.username);
    }

    return target.toString();
}

function buildHelpText() {
    return [
        'Perintah yang tersedia:',
        '',
        '/start - cek status akun',
        '/dashboard - minta magic link dashboard',
        '/help - lihat bantuan',
        '',
        'Untuk mencatat transaksi, kirim pesan natural seperti:',
        'Bakso 15rb',
        'Gaji freelance 2 juta',
        'Bisa juga kirim foto struk atau voice note.'
    ].join('\n');
}

function buildOnboardingText(userName) {
    const name = userName || 'Sobat Cuan';
    return [
        `Halo ${name}! Selamat datang di *HitungUang Bot*! 🚀`,
        '',
        'Saya adalah asisten keuangan pintar Anda. Saya akan membantu Anda mencatat setiap pemasukan dan pengeluaran langsung dari WhatsApp.',
        '',
        '💡 *Cara Mencatat Transaksi:*',
        'Cukup kirim pesan natural, contoh:',
        '• "Bakso 15rb" (Otomatis jadi pengeluaran)',
        '• "Gaji freelance 2jt" (Otomatis jadi pemasukan)',
        '• "Nabung Dana Darurat 500rb" (Masuk ke dompet tabungan)',
        '',
        '📸 *Kirim Foto Struk (coming soon):*',
        'Saya juga bisa membaca struk belanja Anda lewat foto!',
        '',
        '🔗 *Akses Dashboard:*',
        'Ketik *dashboard* kapan saja untuk mendapatkan link masuk ke dashboard visual Anda.',
        '',
        'Selamat mengelola keuangan dengan lebih cerdas! ✨'
    ].join('\n');
}

async function replyUnregistered(message) {
    const registerUrl = buildRegisterUrl(message);
    const welcomeText = [
        'Halo! Saya HitungUang Bot.',
        '',
        'Nomor WhatsApp Anda belum terdaftar. Untuk mulai menggunakan fitur catat otomatis dan dashboard AI, silakan daftar di link berikut:',
        '',
        registerUrl,
        '',
        'Setelah mendaftar, Anda bisa langsung kirim catatan belanja di WhatsApp.'
    ].join('\n');

    await message.reply(welcomeText);
}

function normalizeMessage(input) {
    return {
        text: String(input.text || '').trim(),
        hasMedia: Boolean(input.hasMedia),
        mediaType: input.mediaType || 'text',
        senderId: String(input.senderId || ''),
        chatId: input.chatId ? String(input.chatId) : '',
        chatType: input.chatType || 'private',
        displayName: input.displayName || '',
        username: input.username || '',
        reply: input.reply,
        downloadMedia: input.downloadMedia
    };
}

function buildWalletChoiceReply(wallets) {
    const choices = wallets
        .slice(0, 3)
        .map((wallet, index) => `${index + 1}. ${wallet.nama_dompet}`)
        .join('\n');
    const exampleWallet = wallets[0] ? wallets[0].nama_dompet : 'Dana Darurat';

    return [
        '⚠️ Anda punya beberapa dompet tabungan. Sebutkan dompet tujuan agar saya tidak salah catat.',
        '',
        choices,
        '',
        `Contoh: "Nabung ${exampleWallet} 100rb".`
    ].join('\n');
}

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

async function handleMessage(input) {
    const message = normalizeMessage(input);
    const originalText = message.text;
    const sender = message.senderId;

    if (message.chatType !== 'private') {
        logger.info(`Mengabaikan pesan non-private dari chat ${message.chatId || '-'}`);
        return;
    }

    if (!sender || typeof message.reply !== 'function') {
        throw new Error('Adapter pesan chat tidak lengkap.');
    }

    try {
        logger.info(`Memeriksa registrasi untuk WhatsApp user: ${sender}`);
        const user = await dbService.getUserByTelegramId(sender);
        logger.info(`User profile fetched: ${user?.display_name}, Target: ${user?.target_pengeluaran_bulanan}, LastAlert: ${user?.last_alert_month}`);

        if (!user) {
            logger.warn(`WhatsApp user ${sender} mencoba akses tapi belum terdaftar.`);
            return await replyUnregistered(message);
        }

        if (!user.is_onboarded) {
            await dbService.setOnboarded(user.id);
            await message.reply(buildOnboardingText(user.display_name || message.displayName));
            if (isStartCommand(originalText)) {
                return;
            }
        } else if (isStartCommand(originalText)) {
            return await message.reply(buildOnboardingText(user.display_name || message.displayName));
        }

        if (isHelpCommand(originalText)) {
            return await message.reply(buildHelpText());
        }

        if (isDashboardAccessCommand(originalText)) {
            const link = await authLinkService.requestAuthLink({
                telegramUserId: sender,
                purpose: 'login_web',
                redirectTo: '/dashboard'
            });

            return await message.reply(
                `Ini link masuk Dashboard CuanBeres Anda:\n\n${link.actionLink}\n\nLink ini bersifat pribadi. Jangan dibagikan.`
            );
        }

        const messageType = classifyMessage({
            text: originalText,
            hasMedia: message.hasMedia
        });
        const text = messageType.normalizedText;

        if (!messageType.shouldProcess) {
            logger.info(`Pesan dari ${sender} diabaikan (bukan transaksi/pertanyaan): "${originalText}" (Mode: ${messageType.mode})`);
            return;
        }

        if (messageType.isQuestion) {
            logger.info(`Memproses NL Query dari WhatsApp user ${sender}: "${text}"`);
            const response = await nl2sqlService.processNLQuery(message, sender, user);
            return await message.reply(response);
        }

        if (messageType.isTransactionText || message.hasMedia) {
            let parsedData;
            let rawTextForDb = originalText;

            if (message.hasMedia) {
                if (typeof message.downloadMedia !== 'function') {
                    return await message.reply('⚠️ Media tidak bisa diproses saat ini.');
                }

                logger.info(`Mendownload media dari WhatsApp user ${sender} (${message.mediaType})...`);
                const media = await message.downloadMedia();

                const fileSizeMB = (media.data.length * 3) / 4 / 1024 / 1024;
                if (fileSizeMB > 5) {
                    return await message.reply('⚠️ Ukuran file terlalu besar (Maks 5MB).');
                }

                if (message.mediaType === 'image') {
                    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
                    if (!allowedImageMimes.includes(media.mimetype)) {
                        return await message.reply('⚠️ Format gambar tidak didukung. Kirim JPG, PNG, atau WebP.');
                    }

                    logger.info(`Memproses OCR gambar dari WhatsApp user ${sender}`);
                    parsedData = await aiParser.parseImage(media);
                    rawTextForDb = `[Kirim Gambar] ${originalText}`;
                } else if (message.mediaType === 'voice' || message.mediaType === 'audio') {
                    logger.info(`Memproses audio dari WhatsApp user ${sender}`);
                    parsedData = await aiParser.parseAudio(media);
                    rawTextForDb = '[Voice Note]';
                } else {
                    return await message.reply('⚠️ Format media tidak didukung.');
                }
            } else {
                logger.info(`Mencatat transaksi teks dari WhatsApp user ${sender}: "${text}"`);
                parsedData = await aiParser.parseExpense(text);
            }

            const items = Array.isArray(parsedData) ? parsedData : [parsedData];

            if (items.length === 0 || !items[0].item) {
                throw new Error('Data tidak valid setelah di-parse AI');
            }

            let confirmationText = '✅ *Berhasil Dicatat!* \n\n';
            let totalPengeluaran = 0;
            let totalPemasukan = 0;
            let totalTabungan = 0;
            let projectedAvailableAfterSaving = null;

            let activeWallets = null;

            // Resolve wallet_id untuk tipe tabungan
            for (const item of items) {
                if (item.tipe === 'tabungan') {
                    if (!activeWallets) {
                        activeWallets = await dbService.listActiveWallets(user.id);
                    }

                    if (item.wallet_name) {
                        const wallet = await dbService.findWalletByNameExact(user.id, item.wallet_name) ||
                            await dbService.findWalletByName(user.id, item.wallet_name);
                        if (wallet) {
                            item.wallet_id = wallet.id;
                            item.nama_dompet_asli = wallet.nama_dompet;
                        } else {
                            return await message.reply(`⚠️ Dompet tabungan "${item.wallet_name}" tidak ditemukan. Silakan buat dompet tersebut di Dashboard terlebih dahulu.`);
                        }
                    } else if (activeWallets.length === 1) {
                        item.wallet_id = activeWallets[0].id;
                        item.nama_dompet_asli = activeWallets[0].nama_dompet;
                    } else if (activeWallets.length > 1) {
                        return await message.reply(buildWalletChoiceReply(activeWallets));
                    } else {
                        return await message.reply('⚠️ Anda belum punya dompet tabungan. Silakan buat dompet di Dashboard terlebih dahulu.');
                    }
                }
            }

            const parsedIncomeTotal = items
                .filter((item) => item.tipe === 'pemasukan')
                .reduce((sum, item) => sum + Number(item.harga || 0), 0);
            const parsedExpenseTotal = items
                .filter((item) => item.tipe === 'pengeluaran')
                .reduce((sum, item) => sum + Number(item.harga || 0), 0);
            const parsedSavingsTotal = items
                .filter((item) => item.tipe === 'tabungan')
                .reduce((sum, item) => sum + Number(item.harga || 0), 0);

            if (parsedSavingsTotal > 0) {
                const allocation = await dbService.getMonthlyAllocationSummary(user.id);
                const projectedAvailableBeforeSaving = Number(allocation.availableMoney || 0) + parsedIncomeTotal - parsedExpenseTotal;
                projectedAvailableAfterSaving = projectedAvailableBeforeSaving - parsedSavingsTotal;

                if (projectedAvailableAfterSaving < 0) {
                    return await message.reply([
                        `⚠️ Available money bulan ini belum cukup untuk tabungan ${formatCurrency(parsedSavingsTotal)}.`,
                        `Available money saat ini: ${formatCurrency(allocation.availableMoney)}.`,
                        '',
                        'Catat pemasukan dulu, kurangi nominal tabungan, atau isi saldo awal dari Dashboard jika ini dana lama.'
                    ].join('\n'));
                }
            }

            const insertResult = await dbService.appendTransactions(items.map((item) => ({
                ...item,
                rawText: rawTextForDb,
                telegramUserId: sender,
                userId: user.id,
                wallet_id: item.wallet_id || null
            })));

            if (insertResult && insertResult.duplicate && insertResult.insertedCount === 0) {
                return await message.reply('⚠️ Catatan ini sudah pernah tersimpan sebelumnya, jadi saya tidak mencatat duplikat.');
            }

            for (const item of items) {
                let emoji = '💸';
                let tipeLabel = 'Pengeluaran';
                let displayName = item.item;

                if (item.tipe === 'pemasukan') {
                    emoji = '💰';
                    tipeLabel = 'Pemasukan';
                    totalPemasukan += item.harga;
                } else if (item.tipe === 'tabungan') {
                    emoji = '🏦';
                    tipeLabel = 'Tabungan';
                    displayName = `${item.item} (${item.nama_dompet_asli})`;
                    totalTabungan += item.harga;
                } else {
                    totalPengeluaran += item.harga;
                }

                confirmationText += `${emoji} *${tipeLabel}*: ${displayName} - Rp ${item.harga.toLocaleString('id-ID')}\n`;
            }

            if (items.length > 1) {
                if (totalPemasukan > 0) confirmationText += `\n*Total Pemasukan:* Rp ${totalPemasukan.toLocaleString('id-ID')}`;
                if (totalPengeluaran > 0) confirmationText += `\n*Total Pengeluaran:* Rp ${totalPengeluaran.toLocaleString('id-ID')}`;
                if (totalTabungan > 0) confirmationText += `\n*Total Tabungan:* Rp ${totalTabungan.toLocaleString('id-ID')}`;
            }

            if (insertResult && insertResult.skippedCount > 0) {
                confirmationText += `\n\n⚠️ ${insertResult.skippedCount} item duplikat tidak dicatat ulang.`;
            }

            if (projectedAvailableAfterSaving !== null) {
                confirmationText += `\n\nAvailable money tersisa: ${formatCurrency(projectedAvailableAfterSaving)}`;
            }

            const insertedTransactions = Array.isArray(insertResult?.insertedTransactions)
                ? insertResult.insertedTransactions
                : items;
            let walletUpdateFailed = 0;

            for (const row of insertedTransactions) {
                if (row.tipe === 'tabungan' && row.wallet_id) {
                    const updatedWallet = await dbService.incrementWalletBalance(row.wallet_id, user.id, row.harga);
                    if (!updatedWallet) {
                        walletUpdateFailed += 1;
                    }
                }
            }

            if (walletUpdateFailed > 0) {
                confirmationText += `\n\n⚠️ ${walletUpdateFailed} saldo dompet belum berhasil diperbarui. Transaksi sudah tercatat, silakan cek Dashboard.`;
            }

            await message.reply(confirmationText);
            logger.info(`Berhasil mencatat ${items.length} item ke Supabase untuk WhatsApp user ${sender}`);

            if (totalPengeluaran > 0) {
                await maybeSendSpendingAlert({ message, user });
            }
        }

    } catch (error) {
        logger.error(`Gagal memproses pesan: ${error.message}`);
        await message.reply('Maaf, saya gagal memahami atau mencatat pesan tersebut. Pastikan formatnya jelas (contoh: "Bakso 15rb").');
    }
}

module.exports = {
    handleMessage,
    buildRegisterUrl,
    buildHelpText
};
