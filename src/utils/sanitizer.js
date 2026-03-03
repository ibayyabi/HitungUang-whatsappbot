/**
 * Utility untuk sanitasi input teks agar aman digunakan dalam prompt AI
 */
function sanitizeInput(text, maxLength = 200) {
    if (!text) return '';

    let sanitized = text
        .replace(/`{3,}/g, '') // Hapus triple backticks
        .replace(/["']/g, '')  // Hapus single/double quotes
        .trim();

    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}

module.exports = { sanitizeInput };
