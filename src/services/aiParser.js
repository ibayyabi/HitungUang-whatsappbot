const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const { EXPENSE_PARSER_PROMPT } = require('../config/prompts');
const { sanitizeInput } = require('../utils/sanitizer');


dotenv.config();

class AIParser {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in .env file');
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Menggunakan Gemini 3 Flash yang merupakan standar terbaru di 2026
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
            console.error('Error in AI Parser (Text):', error);
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
            console.error('Error in AI Parser (Image):', error);
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
            console.error('Error in AI Parser (Audio):', error);
            throw error;
        }
    }

    /**
     * Helper untuk memproses hasil dari AI
     */
    async _processResult(result) {
        const responseText = result.response.text().trim();
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(cleanedJson);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', responseText);
            throw new Error('AI returned invalid format');
        }
    }
}

module.exports = new AIParser();
