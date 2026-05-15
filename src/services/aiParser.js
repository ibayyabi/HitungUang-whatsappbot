const { loadEnv } = require('../config/env');

loadEnv();

const { EXPENSE_PARSER_PROMPT } = require('../config/prompts');
const { sanitizeInput } = require('../utils/sanitizer');
const {
    CURRENCY_TOKEN_PATTERN,
    normalizeCurrencyText,
    parseCurrencyAmount
} = require('../utils/currencyNormalizer');
const logger = require('../utils/logger');
const llmService = require('../utils/llmService');
const {
    DEFAULT_TRANSACTION_CATEGORY,
    isValidTransactionCategory,
    isValidTransactionType
} = require('../../shared/contracts');


const PARSE_CACHE_TTL_MS = Number.parseInt(process.env.LLM_PARSE_CACHE_TTL_MS || `${10 * 60 * 1000}`, 10);
const PARSE_CACHE_MAX_ENTRIES = Number.parseInt(process.env.LLM_PARSE_CACHE_MAX_ENTRIES || '500', 10);

const parseCache = new Map();

const EXPENSE_CATEGORY_KEYWORDS = [
    { kategori: 'makan', keywords: ['makan', 'minum', 'jajan', 'bakso', 'nasi', 'mie', 'ayam', 'sate', 'kopi', 'ngopi', 'resto', 'restoran', 'warung', 'sarapan'] },
    { kategori: 'transport', keywords: ['bensin', 'parkir', 'tol', 'ojek', 'gojek', 'grab', 'taxi', 'taksi', 'bus', 'kereta', 'transport'] },
    { kategori: 'belanja', keywords: ['belanja', 'beli', 'alfamart', 'indomaret', 'supermarket', 'shopee', 'tokopedia', 'baju', 'sepatu', 'pakaian'] },
    { kategori: 'hiburan', keywords: ['hiburan', 'nonton', 'bioskop', 'game', 'netflix', 'spotify', 'konser'] },
    { kategori: 'tagihan', keywords: ['tagihan', 'listrik', 'air', 'wifi', 'internet', 'pulsa', 'token', 'cicilan', 'sewa'] },
    { kategori: 'kesehatan', keywords: ['obat', 'dokter', 'klinik', 'rumah sakit', 'vitamin', 'kesehatan'] },
    { kategori: 'pendidikan', keywords: ['sekolah', 'kuliah', 'buku', 'kursus', 'pendidikan', 'ukt', 'spp', 'uang kuliah', 'biaya kuliah', 'semester', 'kampus'] }
];

const INCOME_CATEGORY_KEYWORDS = [
    { kategori: 'gaji', keywords: ['gaji', 'salary'] },
    { kategori: 'freelance', keywords: ['freelance', 'freelancer'] },
    { kategori: 'bisnis', keywords: ['bisnis', 'jualan', 'usaha'] },
    { kategori: 'transfer_masuk', keywords: ['transfer dari', 'terima transfer', 'ditransfer', 'tf dari'] },
    { kategori: 'investasi', keywords: ['investasi', 'dividen', 'saham', 'crypto'] }
];

const INCOME_KEYWORDS = [
    'gaji',
    'bonus',
    'freelance',
    'komisi',
    'pendapatan',
    'pemasukan',
    'income',
    'uang masuk',
    'terima transfer',
    'transfer dari',
    'tf dari',
    'cashback'
];

const SAVING_KEYWORDS = ['nabung', 'menabung', 'tabung', 'tabungan'];

function cloneParsed(value) {
    return JSON.parse(JSON.stringify(value));
}

function clearParseCache() {
    parseCache.clear();
}

function getCachedParse(cacheKey) {
    const cached = parseCache.get(cacheKey);

    if (!cached) {
        return null;
    }

    if (Date.now() - cached.createdAt > PARSE_CACHE_TTL_MS) {
        parseCache.delete(cacheKey);
        return null;
    }

    return cloneParsed(cached.value);
}

function setCachedParse(cacheKey, value) {
    if (parseCache.size >= PARSE_CACHE_MAX_ENTRIES) {
        const oldestKey = parseCache.keys().next().value;
        if (oldestKey) {
            parseCache.delete(oldestKey);
        }
    }

    parseCache.set(cacheKey, {
        createdAt: Date.now(),
        value: cloneParsed(value)
    });
}

function normalizeSpaces(value) {
    return String(value || '')
        .replace(/[,\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function titleCase(value) {
    return normalizeSpaces(value)
        .split(' ')
        .filter(Boolean)
        .map((word) => {
            const lowered = word.toLowerCase();
            return `${lowered.charAt(0).toUpperCase()}${lowered.slice(1)}`;
        })
        .join(' ');
}

function hasAnyKeyword(text, keywords) {
    return keywords.some((keyword) => text.includes(keyword));
}

function collectCurrencyMatches(text) {
    const matches = [];
    CURRENCY_TOKEN_PATTERN.lastIndex = 0;

    let match;
    while ((match = CURRENCY_TOKEN_PATTERN.exec(text)) !== null) {
        const rawToken = match[0];
        const hasPrefix = /^rp/i.test(rawToken.trim());
        const hasSuffix = Boolean(match[2]);
        const nextIndex = CURRENCY_TOKEN_PATTERN.lastIndex;
        const amount = parseCurrencyAmount(rawToken);
        CURRENCY_TOKEN_PATTERN.lastIndex = nextIndex;

        if ((hasPrefix || hasSuffix || amount >= 1000) && Number.isFinite(amount) && amount > 0) {
            matches.push({
                amount,
                index: match.index,
                length: rawToken.length,
                rawToken
            });
        }
    }

    return matches;
}

function stripCommonWords(value, tipe) {
    let result = normalizeSpaces(value);

    result = result
        .replace(/\b(aku|saya|gw|gue|barusan|tadi|hari ini)\b/gi, ' ')
        .replace(/\b(di|ke)\s*$/gi, ' ');

    if (tipe === 'pemasukan') {
        result = result
            .replace(/\b(terima|dapat|dapet|menerima|masuk|cair)\b/gi, ' ')
            .replace(/\b(dari)\s*$/gi, ' ');
    } else if (tipe === 'tabungan') {
        result = result.replace(/\b(ke|untuk)\s*$/gi, ' ');
    } else {
        result = result.replace(/^\b(beli|bayar|jajan|topup|top up|isi|buat|untuk|masuk|keluar)\b\s*/gi, ' ');
    }

    return normalizeSpaces(result);
}

function detectTransactionType(normalizedText) {
    if (hasAnyKeyword(normalizedText, SAVING_KEYWORDS)) {
        return 'tabungan';
    }

    if (hasAnyKeyword(normalizedText, INCOME_KEYWORDS)) {
        return 'pemasukan';
    }

    return 'pengeluaran';
}

function detectCategory(normalizedText, tipe) {
    if (tipe === 'tabungan') {
        return 'tabungan';
    }

    const keywordGroups = tipe === 'pemasukan' ? INCOME_CATEGORY_KEYWORDS : EXPENSE_CATEGORY_KEYWORDS;
    const fallback = tipe === 'pemasukan' ? 'lainnya_masuk' : DEFAULT_TRANSACTION_CATEGORY;
    const match = keywordGroups.find((group) => hasAnyKeyword(normalizedText, group.keywords));

    return match ? match.kategori : fallback;
}

function isGenericCategory(kategori, tipe) {
    if (tipe === 'pemasukan') {
        return kategori === 'lainnya_masuk';
    }

    if (tipe === 'pengeluaran') {
        return kategori === DEFAULT_TRANSACTION_CATEGORY;
    }

    return false;
}

function splitLocation(textWithoutAmount) {
    const locationMatch = textWithoutAmount.match(/\bdi\s+(.+)$/i);

    if (!locationMatch) {
        return {
            itemText: textWithoutAmount,
            lokasi: null
        };
    }

    const itemText = normalizeSpaces(textWithoutAmount.slice(0, locationMatch.index));
    const lokasi = normalizeSpaces(locationMatch[1]);

    if (!itemText || !lokasi) {
        return {
            itemText: textWithoutAmount,
            lokasi: null
        };
    }

    return {
        itemText,
        lokasi
    };
}

function buildSavingItem(itemText) {
    const stripped = normalizeSpaces(itemText.replace(/^\b(nabung|menabung|tabung|tabungan)\b\s*/i, ''));

    if (!stripped) {
        return {
            item: 'Nabung',
            wallet_name: null
        };
    }

    const walletName = titleCase(stripped);

    return {
        item: `Nabung ${walletName}`,
        wallet_name: walletName
    };
}

function parseSimpleTransaction(text, options = {}) {
    const allowGenericCategory = Boolean(options.allowGenericCategory);
    const normalizedText = normalizeSpaces(text).toLowerCase();
    const amountMatches = collectCurrencyMatches(text);

    if (amountMatches.length !== 1) {
        return null;
    }

    const amountMatch = amountMatches[0];
    const textWithoutAmount = normalizeSpaces(
        `${text.slice(0, amountMatch.index)} ${text.slice(amountMatch.index + amountMatch.length)}`
    );

    if (!/[a-zA-Z\u00C0-\u024F]/.test(textWithoutAmount)) {
        return null;
    }

    const tipe = detectTransactionType(normalizedText);
    const kategori = detectCategory(normalizedText, tipe);

    if (!allowGenericCategory && isGenericCategory(kategori, tipe)) {
        return null;
    }

    const { itemText, lokasi } = splitLocation(textWithoutAmount);
    const strippedItemText = stripCommonWords(itemText, tipe);

    if (!strippedItemText) {
        return null;
    }

    let item = titleCase(strippedItemText);
    const parsed = {
        item,
        harga: amountMatch.amount,
        kategori,
        lokasi: lokasi ? titleCase(lokasi) : null,
        tipe
    };

    if (tipe === 'tabungan') {
        const savingItem = buildSavingItem(strippedItemText);
        parsed.item = savingItem.item;
        if (savingItem.wallet_name) {
            parsed.wallet_name = savingItem.wallet_name;
        }
    }

    return normalizeParsedExpense(parsed);
}

function extractJsonPayload(responseText) {
    const trimmed = (responseText || '').trim();
    const withoutCodeFence = trimmed.replace(/```json|```/gi, '').trim();

    if (!withoutCodeFence) {
        throw new Error('AI returned empty response');
    }

    const directStart = withoutCodeFence[0];
    if (directStart === '{' || directStart === '[') {
        return withoutCodeFence;
    }

    const firstObjectIndex = withoutCodeFence.indexOf('{');
    const firstArrayIndex = withoutCodeFence.indexOf('[');
    const startCandidates = [firstObjectIndex, firstArrayIndex].filter((index) => index >= 0);

    if (startCandidates.length === 0) {
        throw new Error('AI response does not contain JSON');
    }

    const startIndex = Math.min(...startCandidates);
    const openingChar = withoutCodeFence[startIndex];
    const closingChar = openingChar === '{' ? '}' : ']';
    const endIndex = withoutCodeFence.lastIndexOf(closingChar);

    if (endIndex <= startIndex) {
        throw new Error('AI response contains incomplete JSON');
    }

    return withoutCodeFence.slice(startIndex, endIndex + 1).trim();
}

function normalizeParsedExpense(parsed) {
    const items = Array.isArray(parsed) ? parsed : [parsed];

    if (items.length === 0) {
        throw new Error('AI returned empty transaction list');
    }

    const normalizedItems = items.map((item) => {
        if (!item || typeof item !== 'object') {
            throw new Error('AI returned invalid transaction item');
        }

        const normalizedItem = {
            item: typeof item.item === 'string' ? item.item.trim() : '',
            harga: typeof item.harga === 'string' 
                ? parseCurrencyAmount(item.harga)
                : Number(item.harga),
            kategori: typeof item.kategori === 'string' && item.kategori.trim() ? item.kategori.trim().toLowerCase() : DEFAULT_TRANSACTION_CATEGORY,
            lokasi: typeof item.lokasi === 'string' && item.lokasi.trim() ? item.lokasi.trim() : null,
            tipe: typeof item.tipe === 'string' ? item.tipe.trim().toLowerCase() : ''
        };

        if (normalizedItem.tipe === 'tabungan' && typeof item.wallet_name === 'string') {
            normalizedItem.wallet_name = item.wallet_name.trim();
        }

        if (!normalizedItem.item) {
            throw new Error('AI transaction item is missing name');
        }

        if (!Number.isFinite(normalizedItem.harga) || normalizedItem.harga <= 0) {
            throw new Error('AI transaction item has invalid amount');
        }

        if (!isValidTransactionType(normalizedItem.tipe)) {
            throw new Error('AI transaction item has invalid type');
        }

        if (!isValidTransactionCategory(normalizedItem.kategori)) {
            if (normalizedItem.tipe === 'pemasukan') {
                normalizedItem.kategori = 'lainnya_masuk';
            } else if (normalizedItem.tipe === 'tabungan') {
                normalizedItem.kategori = 'tabungan';
            } else {
                normalizedItem.kategori = DEFAULT_TRANSACTION_CATEGORY;
            }
        }

        return normalizedItem;
    });

    return Array.isArray(parsed) ? normalizedItems : normalizedItems[0];
}

class AIParser {
    constructor() {
        // Initialization is now handled by llmService
    }

    /**
     * Parse pesan chat menjadi data terstruktur menggunakan Gemini AI
     */
    async parseExpense(text) {
        try {
            const cleanText = sanitizeInput(text);
            const normalizedText = normalizeCurrencyText(cleanText);
            const cacheKey = `text:${normalizedText.toLowerCase()}`;
            const cached = getCachedParse(cacheKey);

            if (cached) {
                logger.info(`LLM parser skipped: cache_hit input="${normalizedText}" llm_called=false`);
                return cached;
            }

            const deterministicResult = parseSimpleTransaction(normalizedText, {
                allowGenericCategory: process.env.LLM_FALLBACK_ENABLED === 'false'
            });

            if (deterministicResult) {
                logger.info(`LLM parser skipped: deterministic_transaction input="${normalizedText}" llm_called=false`);
                setCachedParse(cacheKey, deterministicResult);
                return deterministicResult;
            }

            if (process.env.LLM_FALLBACK_ENABLED === 'false') {
                logger.warn(`LLM parser disabled and deterministic parser could not parse input="${normalizedText}"`);
                throw new Error('LLM fallback disabled');
            }

            const prompt = `${EXPENSE_PARSER_PROMPT}\n\nInput: "${normalizedText}"\nOutput:`;
            const { result, modelName } = await llmService.generateContentWithFallback(prompt, {
                maxOutputTokens: 512
            });
            
            logger.info(`LLM parser called: reason=fallback_text model=${modelName} llm_called=true`);
            const parsed = await this._processResult(result);
            setCachedParse(cacheKey, parsed);
            return parsed;
        } catch (error) {
            logger.error(`Error in AI Parser (Text): ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse gambar (OCR) menjadi data terstruktur
     */
    async parseImage(media) {
        try {
            const prompt = `${EXPENSE_PARSER_PROMPT}\n\nEkstrak data transaksi dari gambar bukti pembayaran ini.`;
            const imageParts = [
                {
                    inlineData: {
                        data: media.data,
                        mimeType: media.mimetype
                    }
                }
            ];

            const { result, modelName } = await llmService.generateContentWithFallback([prompt, ...imageParts], {
                maxOutputTokens: 768
            });

            logger.info(`LLM parser called: reason=media_image model=${modelName} llm_called=true`);
            return this._processResult(result);
        } catch (error) {
            logger.error(`Error in AI Parser (Image): ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse audio (Voice Note) menjadi data terstruktur
     */
    async parseAudio(media) {
        try {
            const prompt = `${EXPENSE_PARSER_PROMPT}\n\nEkstrak data transaksi dari rekaman suara ini.`;
            const audioParts = [
                {
                    inlineData: {
                        data: media.data,
                        mimeType: media.mimetype
                    }
                }
            ];

            const { result, modelName } = await llmService.generateContentWithFallback([prompt, ...audioParts], {
                maxOutputTokens: 768
            });

            logger.info(`LLM parser called: reason=media_audio model=${modelName} llm_called=true`);
            return this._processResult(result);
        } catch (error) {
            logger.error(`Error in AI Parser (Audio): ${error.message}`);
            throw error;
        }
    }

    /**
     * Helper untuk memproses hasil dari AI
     */
    async _processResult(result) {
        const responseText = result.response.text().trim();

        try {
            const jsonPayload = extractJsonPayload(responseText);
            const parsed = JSON.parse(jsonPayload);
            return normalizeParsedExpense(parsed);
        } catch (parseError) {
            logger.error(`Failed to parse AI response: ${parseError.message}`);
            throw new Error('AI returned invalid format');
        }
    }
}

module.exports = new AIParser();
module.exports.AIParser = AIParser;
module.exports.clearParseCache = clearParseCache;
module.exports.extractJsonPayload = extractJsonPayload;
module.exports.normalizeParsedExpense = normalizeParsedExpense;
module.exports.parseSimpleTransaction = parseSimpleTransaction;
