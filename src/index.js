const TelegramBot = require('node-telegram-bot-api');
const { handleMessage } = require('./handlers/messageHandler');
const RateLimiter = require('./utils/rateLimiter');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

dotenv.config();

const limiter = new RateLimiter(10, 60000);
const token = process.env.TELEGRAM_BOT_TOKEN;

let bot;

function getTelegramFileId(msg) {
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
        return msg.photo[msg.photo.length - 1].file_id;
    }

    if (msg.voice) return msg.voice.file_id;
    if (msg.audio) return msg.audio.file_id;
    if (msg.document) return msg.document.file_id;

    return null;
}

function getMediaType(msg) {
    if (Array.isArray(msg.photo) && msg.photo.length > 0) return 'image';
    if (msg.voice) return 'voice';
    if (msg.audio) return 'audio';
    if (msg.document) return 'document';
    return 'text';
}

function inferMimeType(msg, filePath) {
    if (Array.isArray(msg.photo) && msg.photo.length > 0) return 'image/jpeg';
    if (msg.voice) return msg.voice.mime_type || 'audio/ogg';
    if (msg.audio) return msg.audio.mime_type || 'audio/mpeg';
    if (msg.document && msg.document.mime_type) return msg.document.mime_type;

    const lowered = String(filePath || '').toLowerCase();
    if (lowered.endsWith('.png')) return 'image/png';
    if (lowered.endsWith('.webp')) return 'image/webp';
    if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg';
    if (lowered.endsWith('.ogg')) return 'audio/ogg';
    if (lowered.endsWith('.mp3')) return 'audio/mpeg';
    if (lowered.endsWith('.m4a')) return 'audio/mp4';

    return 'application/octet-stream';
}

async function downloadTelegramMedia(msg) {
    const fileId = getTelegramFileId(msg);

    if (!fileId) {
        throw new Error('Telegram file_id tidak ditemukan.');
    }

    const file = await bot.getFile(fileId);
    const fileUrl = await bot.getFileLink(fileId);
    const response = await fetch(fileUrl);

    if (!response.ok) {
        throw new Error(`Gagal download file Telegram: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
        mimetype: inferMimeType(msg, file.file_path),
        data: buffer.toString('base64'),
        filename: msg.document?.file_name || file.file_path || fileId
    };
}

function createMessageAdapter(msg) {
    const senderId = String(msg.from.id);
    const chatId = String(msg.chat.id);
    const text = msg.text || msg.caption || '';
    const mediaType = getMediaType(msg);

    return {
        text,
        hasMedia: mediaType !== 'text',
        mediaType,
        senderId,
        chatId,
        chatType: msg.chat.type,
        displayName: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' '),
        username: msg.from.username || '',
        reply: (replyText) => bot.sendMessage(chatId, replyText),
        downloadMedia: () => downloadTelegramMedia(msg)
    };
}

async function processMessage(msg) {
    if (!msg.from || msg.from.is_bot) {
        return;
    }

    if (msg.chat.type !== 'private') {
        logger.info(`Mengabaikan chat Telegram non-private: ${msg.chat.id}`);
        return;
    }

    const sender = String(msg.from.id);

    if (limiter.isRateLimited(sender)) {
        logger.warn(`Rate limit terlampaui untuk Telegram user ${sender}`);
        await bot.sendMessage(msg.chat.id, '⚠️ Anda mengirim pesan terlalu cepat. Silakan tunggu sebentar.');
        return;
    }

    await handleMessage(createMessageAdapter(msg));
}

async function safelyProcessMessage(msg) {
    try {
        await processMessage(msg);
    } catch (error) {
        logger.error(`Gagal memproses pesan Telegram: ${error.stack || error.message}`);
        if (msg.chat && msg.chat.id) {
            await bot.sendMessage(msg.chat.id, 'Maaf, terjadi error saat memproses pesan Anda.');
        }
    }
}

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
    logger.error(`Unhandled promise rejection: ${message}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.stack || error.message}`);
});

async function bootstrap() {
    if (!token) {
        logger.error('TELEGRAM_BOT_TOKEN belum diset.');
        process.exit(1);
    }

    bot = new TelegramBot(token, { polling: true });
    bot.on('message', safelyProcessMessage);
    bot.on('polling_error', (error) => {
        logger.error(`Telegram polling error: ${error.message}`);
    });

    logger.info('Bot Telegram long polling siap.');
    console.log('Bot Telegram long polling siap.');
}

const shutdown = async () => {
    logger.info('Menghentikan bot Telegram...');
    try {
        if (bot) {
            await bot.stopPolling();
        }
        logger.info('Bot Telegram berhasil dihentikan.');
        process.exit(0);
    } catch (err) {
        logger.error(`Error saat shutdown: ${err.message}`);
        process.exit(1);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap();

module.exports = {
    createMessageAdapter,
    getMediaType,
    inferMimeType
};
