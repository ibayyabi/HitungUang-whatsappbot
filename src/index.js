const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./handlers/messageHandler');
const RateLimiter = require('./utils/rateLimiter');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

dotenv.config();

// Batasi 10 pesan per menit per user
const limiter = new RateLimiter(10, 60000);


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

client.on('qr', (qr) => {
    console.log('\n--- SCAN QR CODE INI DENGAN WHATSAPP KAMU ---\n');
    qrcode.generate(qr, { small: true });
    logger.info('QR Code di-generate, menunggu scan...');
});

client.on('ready', () => {
    console.log('\n Bot HitungUang SIAP!');
    logger.info('Bot WhatsApp Ready');
});

client.on('message', async (msg) => {
    processMessage(msg);
});
client.on('message_create', async (msg) => {
    if (msg.fromMe) {
        processMessage(msg);
    }
});

async function processMessage(msg) {
    if (msg.id.remote.endsWith('@g.us')) return;

    const text = msg.body;
    const botSignatures = [
        '✅ *Berhasil Dicatat!*',
        '📊 *Hasil Analisa AI*',
        'Halo! 👋 Saya *HitungUang Bot*',
        '⚠️ *Nomor Anda belum terhubung*',
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
    handleMessage(msg);
}

// Jalankan Bot
console.log('Sedang memulai WhatsApp Client...');
client.initialize();
