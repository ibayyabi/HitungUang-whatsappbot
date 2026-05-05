export function sanitizeText(text) {
    return String(text || '')
        .trim()
        .replace(/[<>]/g, ''); // Basic XSS prevention
}

export function validatePhone(phone) {
    const normalized = phone.replace(/\D/g, '');
    if (!normalized.startsWith('62')) {
        return { valid: false, error: 'Nomor harus dimulai dengan 62' };
    }
    if (normalized.length < 10 || normalized.length > 15) {
        return { valid: false, error: 'Panjang nomor tidak valid (10-15 digit)' };
    }
    return { valid: true, error: null };
}

export function validateAmount(amount, min = 0, max = 999999999) {
    const num = Number(amount);
    if (isNaN(num)) {
        return { valid: false, error: 'Harus berupa angka' };
    }
    if (num < min) {
        return { valid: false, error: `Minimal Rp ${min.toLocaleString('id-ID')}` };
    }
    if (num > max) {
        return { valid: false, error: `Maksimal Rp ${max.toLocaleString('id-ID')}` };
    }
    return { valid: true, error: null };
}

export function validateRequired(value, fieldName = 'Field') {
    if (!value || String(value).trim() === '') {
        return { valid: false, error: `${fieldName} wajib diisi` };
    }
    return { valid: true, error: null };
}
