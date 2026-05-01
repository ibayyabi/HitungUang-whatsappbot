const dbService = require('./dbService');
const logger = require('../utils/logger');
const { isValidAuthPurpose } = require('../../shared/contracts');

const DEFAULT_PURPOSE = 'login_web';
const DEFAULT_REDIRECT_PATH = '/';
const DEFAULT_PROXY_EMAIL_DOMAIN = 'auth.cuanberes.local';

function normalizeWhatsappNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function maskWhatsappNumber(value) {
    if (!value) {
        return '';
    }

    if (value.length <= 4) {
        return value;
    }

    return `${value.slice(0, 4)}${'*'.repeat(Math.max(value.length - 6, 1))}${value.slice(-2)}`;
}

function sanitizeRedirectPath(value) {
    const normalized = String(value || '').trim();

    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
        return DEFAULT_REDIRECT_PATH;
    }

    return normalized;
}

function buildProxyEmail(whatsappNumber) {
    const domain = process.env.AUTH_PROXY_EMAIL_DOMAIN || DEFAULT_PROXY_EMAIL_DOMAIN;
    return `wa-${whatsappNumber}@${domain}`;
}

function buildVerifyRedirectUrl({ purpose, redirectTo }) {
    const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const target = new URL('/verify', baseUrl);

    target.searchParams.set('purpose', purpose);
    target.searchParams.set('next', sanitizeRedirectPath(redirectTo));

    return target.toString();
}

async function ensureAuthUserEmail(profile) {
    let authUser;
    
    try {
        const { data, error } = await dbService.supabase.auth.admin.getUserById(profile.id);
        
        if (error) {
            // Jika user tidak ditemukan di Auth (orphaned profile)
            if (error.status === 404 || error.code === 'user_not_found') {
                logger.warn(`User orphan ditemukan untuk profile ${profile.id}, mencoba memulihkan...`);
                
                const proxyEmail = buildProxyEmail(profile.whatsapp_number);
                
                // 1. Coba cari apakah ada user lain dengan email ini
                const { data: usersData } = await dbService.supabase.auth.admin.listUsers();
                const existingUser = usersData?.users?.find(u => u.email === proxyEmail);
                
                if (existingUser) {
                    // Update profile agar ID-nya sinkron dengan auth.user yang ada
                    const { error: updateError } = await dbService.supabase
                        .from('profiles')
                        .update({ id: existingUser.id })
                        .eq('whatsapp_number', profile.whatsapp_number);
                        
                    if (updateError) throw updateError;
                    return existingUser.email;
                }
                
                // 2. Jika benar-benar tidak ada di Auth, buat baru (ini akan butuh pendaftaran ulang via bot)
                throw new Error('Akun autentikasi Anda tidak ditemukan. Silakan lakukan pendaftaran ulang via WhatsApp Bot.');
            }
            throw error;
        }
        
        authUser = data && data.user;
    } catch (err) {
        logger.error(`Detail error ensureAuthUserEmail: ${err.message}`);
        throw err;
    }

    if (!authUser) {
        throw new Error(`Auth user tidak ditemukan untuk profile ${profile.id}`);
    }

    if (authUser.email) {
        return authUser.email;
    }

    const proxyEmail = buildProxyEmail(profile.whatsapp_number);
    const updatePayload = {
        email: proxyEmail,
        email_confirm: true,
        user_metadata: {
            ...(authUser.user_metadata || {}),
            whatsapp_number: profile.whatsapp_number
        }
    };

    const { data: updatedData, error: updateError } = await dbService.supabase.auth.admin.updateUserById(profile.id, updatePayload);

    if (updateError) {
        throw updateError;
    }

    return updatedData.user.email;
}

async function requestAuthLink(input) {
    const whatsappNumber = normalizeWhatsappNumber(input && input.whatsappNumber);
    const purpose = String((input && input.purpose) || DEFAULT_PURPOSE).trim().toLowerCase();
    const redirectTo = sanitizeRedirectPath(input && input.redirectTo);

    if (!whatsappNumber || whatsappNumber.length < 8) {
        throw new Error('Nomor WhatsApp tidak valid.');
    }

    if (!isValidAuthPurpose(purpose)) {
        throw new Error('Purpose auth tidak valid.');
    }

    const profile = await dbService.getUserByWhatsapp(whatsappNumber);

    if (!profile) {
        throw new Error('Nomor WhatsApp belum terdaftar.');
    }

    const email = await ensureAuthUserEmail(profile);
    const redirectUrl = buildVerifyRedirectUrl({ purpose, redirectTo });
    const { data, error } = await dbService.supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
            redirectTo: redirectUrl
        }
    });

    if (error) {
        throw error;
    }

    const properties = (data && data.properties) || {};
    const actionLink = properties.action_link || properties.actionLink;

    if (!actionLink) {
        throw new Error('Supabase tidak mengembalikan action link.');
    }

    logger.info(`Magic link ${purpose} dibuat untuk ${whatsappNumber}`);

    return {
        userId: profile.id,
        whatsappNumber,
        maskedWhatsappNumber: maskWhatsappNumber(whatsappNumber),
        purpose,
        redirectTo,
        redirectUrl,
        actionLink
    };
}

module.exports = {
    normalizeWhatsappNumber,
    maskWhatsappNumber,
    sanitizeRedirectPath,
    buildProxyEmail,
    buildVerifyRedirectUrl,
    ensureAuthUserEmail,
    requestAuthLink
};
