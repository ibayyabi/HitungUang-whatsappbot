const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("./logger");
const { loadEnv } = require("../config/env");

loadEnv();

const PRIMARY_MODEL =
  process.env.GEMINI_MODEL || process.env.GEMINI_TEXT_MODEL || "gemma-4-26b";

/**
 * List model yang tersedia sesuai urutan prioritas.
 * Gemma 3 27B IT adalah model utama, lainnya sebagai fallback.
 */
const MODEL_PRIORITY = [
  PRIMARY_MODEL,
  "gemma-4-26b",
  "gemma-4-31b",
  "gemini-3-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
];

class LLMService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY is not defined in .env file");
    }
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.models = [...new Set(MODEL_PRIORITY)]; // Remove duplicates if GEMINI_MODEL is in the list
  }

  /**
   * Menjalankan generateContent dengan mekanisme fallback otomatis jika limit tercapai.
   *
   * @param {string|Array} prompt - Prompt teks atau array part (untuk media)
   * @param {Object} options - Konfigurasi model (generationConfig, dll)
   * @param {number} attempt - Index model saat ini (internal use)
   * @returns {Promise<Object>} Object berisi result dan modelName yang berhasil
   */
  async generateContentWithFallback(prompt, options = {}, attempt = 0) {
    if (!this.genAI) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    if (attempt >= this.models.length) {
      const errorMsg = "All LLM models failed or reached limit";
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const modelName = this.models[attempt];

    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: options.generationConfig || {
          temperature: 0,
          maxOutputTokens: options.maxOutputTokens || 512,
        },
      });

      const result = await model.generateContent(prompt);

      // Log keberhasilan jika bukan attempt pertama (artinya fallback bekerja)
      if (attempt > 0) {
        logger.info(
          `Fallback successful: used ${modelName} after previous models failed`,
        );
      }

      return { result, modelName };
    } catch (error) {
      const errorMsg = error.message || "";
      const isRateLimit =
        errorMsg.includes("429") ||
        errorMsg.toLowerCase().includes("limit") ||
        errorMsg.toLowerCase().includes("quota") ||
        errorMsg.toLowerCase().includes("overloaded");

      if (isRateLimit) {
        logger.warn(
          `LLM Model Limit reached for ${modelName}: ${errorMsg}. Attempting fallback to ${this.models[attempt + 1] || "none"}...`,
        );
        return this.generateContentWithFallback(prompt, options, attempt + 1);
      }

      // Jika error bukan rate limit, mungkin ada masalah lain (misal safety settings)
      // Tapi kita tetap coba fallback jika model berikutnya tersedia
      logger.error(`LLM Error with ${modelName}: ${errorMsg}`);
      if (attempt < this.models.length - 1) {
        logger.info(
          `Attempting fallback to ${this.models[attempt + 1]} due to error...`,
        );
        return this.generateContentWithFallback(prompt, options, attempt + 1);
      }

      throw error;
    }
  }
}

module.exports = new LLMService();
module.exports.LLMService = LLMService;
