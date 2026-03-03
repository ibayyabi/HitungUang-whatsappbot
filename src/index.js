const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./handlers/messageHandler');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

dotenv.config();

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(), // Menyimpan session agar tidak perlu scan QR terus
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

// Event: Menampilkan QR Code di Terminal
client.on('qr', (qr) => {
    console.log('\n--- SCAN QR CODE INI DENGAN WHATSAPP KAMU ---\n');
    qrcode.generate(qr, { small: true });
    logger.info('QR Code di-generate, menunggu scan...');
});

// Event: Berhasil Login
client.on('ready', () => {
    console.log('\n Bot HitungUang SIAP!');
    logger.info('Bot WhatsApp Ready');
});

// Event: Menerima Pesan dari orang lain
client.on('message', async (msg) => {
    processMessage(msg);
});

// Event: Menerima Pesan yang kita kirim sendiri (Message Yourself)
client.on('message_create', async (msg) => {
    // Kita hanya proses jika pesan tsb dibuat oleh kita sendiri (self)
    // dan bukan merupakan balasan dari bot (untuk menghindari loop)
    if (msg.fromMe) {
        processMessage(msg);
    }
});

/**
 * Fungsi pembantu untuk memproses pesan dengan filter terpusat
 */
async function processMessage(msg) {
    // 1. Abaikan Group (tanpa getChat untuk menghindari bug library di self-chat)
    if (msg.id.remote.endsWith('@g.us')) return;

    const text = msg.body;

    // 2. BOT GUARD: Abaikan jika pesan ini adalah balasan dari Bot itu sendiri (mencegah loop)
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

    // 3. Filter allowed numbers (opsional dari .env)
    const allowedNumbers = process.env.ALLOWED_NUMBERS ? process.env.ALLOWED_NUMBERS.split(',') : [];

    // Penentuan sender yang akurat untuk log/filter
    // Jika pesan dari kita (fromMe), maka subjeknya adalah nomor kita sendiri (msg.from)
    const sender = msg.from.split('@')[0];

    if (allowedNumbers.length > 0 && !allowedNumbers.includes(sender)) {
        return;
    }

    // 4. Jalankan handler
    handleMessage(msg);
}

// Jalankan Bot
console.log('Sedang memulai WhatsApp Client...');
client.initialize();
