const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./handlers/messageHandler');
const { startWhatsappDispatchServer } = require('./services/whatsappDispatchServer');
const RateLimiter = require('./utils/rateLimiter');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

dotenv.config();

// Batasi 10 pesan per menit per user
const limiter = new RateLimiter(10, 60000);
let isWhatsappReady = false;
let dispatchServer = null;
let lastDisconnect = null;

function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    return String(error);
}

function isWhatsappNavigationAfterDisconnect(error) {
    const message = getErrorMessage(error);
    const disconnectedRecently = lastDisconnect && Date.now() - lastDisconnect.at < 15000;

    return disconnectedRecently
        && message.includes('Execution context was destroyed')
        && message.includes('Client.inject');
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('loading_screen', (percent, message) => {
    console.log(`🔄 Sedang memuat WhatsApp: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
    console.log('✅ Autentikasi Berhasil!');
    logger.info('WhatsApp Client authenticated');
});

client.on('qr', (qr) => {
    console.log('\n--- SCAN QR CODE INI DENGAN WHATSAPP KAMU ---\n');
    qrcode.generate(qr, { small: true });
    logger.info('QR Code di-generate, menunggu scan...');
});

client.on('ready', () => {
    isWhatsappReady = true;
    lastDisconnect = null;
    console.log('\n Bot HitungUang SIAP!');
    logger.info('Bot WhatsApp Ready');
});

client.on('message_create', async (msg) => {
    // Proses semua pesan (baik masuk maupun keluar) melalui satu pintu
    // safelyProcessMessage sudah memanggil processMessage yang memfilter bot signatures
    const source = msg.fromMe ? 'sent_message' : 'incoming_message';
    await safelyProcessMessage(msg, source);
});

client.on('auth_failure', (message) => {
    logger.error(`Auth failure WhatsApp Client: ${message}`);
});

client.on('disconnected', (reason) => {
    isWhatsappReady = false;
    lastDisconnect = {
        reason,
        at: Date.now()
    };
    logger.warn(`WhatsApp Client disconnected: ${reason}`);
});

client.on('change_state', (state) => {
    logger.info(`WhatsApp Client state changed: ${state}`);
});

async function processMessage(msg) {
    if (msg.id.remote.endsWith('@g.us')) return;

    const text = msg.body;
    const botSignatures = [
        '✅ *Berhasil Dicatat!*',
        '📊 *Hasil Analisa AI*',
        'Halo! 👋 Saya *HitungUang Bot*',
        '⚠️ *Nomor Anda belum terhubung*',
        'Ini link masuk Dashboard CuanBeres Anda:',
        '↩️ Transaksi terakhir dihapus:',
        'Belum ada transaksi yang bisa dihapus.',
        '❌ Maaf, saya gagal'
    ];

    if (botSignatures.some(sig => text.includes(sig))) {
        return;
    }

    // const allowedNumbers = process.env.ALLOWED_NUMBERS ? process.env.ALLOWED_NUMBERS.split(',') : [];

    const contact = await msg.getContact();
    const sender = contact.number;

    // Cek Rate Limit (Anti-Flood)
    if (limiter.isRateLimited(sender)) {
        logger.warn(`Rate limit terlampaui untuk ${sender}`);
        return await msg.reply('⚠️ Anda mengirim pesan terlalu cepat. Silakan tunggu sebentar.');
    }

    // if (allowedNumbers.length > 0 && !allowedNumbers.includes(sender)) {
    //     return;
    // }

    // 4. Jalankan handler
    await handleMessage(msg);
}

async function safelyProcessMessage(msg, source) {
    try {
        await processMessage(msg);
    } catch (error) {
        logger.error(`Gagal memproses event ${source}: ${error.message}`);
    }
}

process.on('unhandledRejection', (reason) => {
    if (isWhatsappNavigationAfterDisconnect(reason)) {
        logger.warn(`WhatsApp Client navigation stopped after disconnect (${lastDisconnect.reason}). Ignored internal puppeteer rejection.`);
        return;
    }

    const message = getErrorMessage(reason);
    logger.error(`Unhandled promise rejection: ${message}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.stack || error.message}`);
});

async function bootstrap() {
    try {
        console.log('Sedang memulai WhatsApp Client...');
        dispatchServer = startWhatsappDispatchServer({
            client,
            isReady: () => isWhatsappReady
        });
        await client.initialize();
    } catch (error) {
        logger.error(`Gagal initialize WhatsApp Client: ${error.stack || error.message}`);
        process.exit(1);
    }
}

// Tangani penghentian proses agar tidak ada zombie chrome
const shutdown = async () => {
    logger.info('Menghentikan bot...');
    try {
        if (dispatchServer) {
            await new Promise((resolve) => dispatchServer.close(resolve));
            logger.info('WhatsApp dispatch server dihentikan.');
        }
        await client.destroy();
        logger.info('Bot berhasil dihentikan.');
        process.exit(0);
    } catch (err) {
        logger.error(`Error saat shutdown: ${err.message}`);
        process.exit(1);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap();
