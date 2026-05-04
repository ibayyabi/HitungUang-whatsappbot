const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const { EXPENSE_PARSER_PROMPT } = require('../config/prompts');
const { sanitizeInput } = require('../utils/sanitizer');
const logger = require('../utils/logger');
const {
    DEFAULT_TRANSACTION_CATEGORY,
    isValidTransactionCategory,
    isValidTransactionType
} = require('../../shared/contracts');


dotenv.config();

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
                ? Number(item.harga.replace(/[.,]/g, '')) 
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
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in .env file');
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Menggunakan Gemini Flash untuk kecepatan dan efisiensi
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Parse pesan chat menjadi data terstruktur menggunakan Gemini AI
     */
    async parseExpense(text) {
        try {
            const cleanText = sanitizeInput(text);
            const prompt = `${EXPENSE_PARSER_PROMPT}\n\nInput: "${cleanText}"\nOutput:`;
            const result = await this.model.generateContent(prompt);
            return this._processResult(result);
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

            const result = await this.model.generateContent([prompt, ...imageParts]);
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

            const result = await this.model.generateContent([prompt, ...audioParts]);
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
module.exports.extractJsonPayload = extractJsonPayload;
module.exports.normalizeParsedExpense = normalizeParsedExpense;
