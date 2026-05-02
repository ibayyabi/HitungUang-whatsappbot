const dbService = require('./dbService');
const logger = require('../utils/logger');
const { isValidAuthPurpose } = require('../../shared/contracts');

const DEFAULT_PURPOSE = 'login_web';
const DEFAULT_REDIRECT_PATH = '/';
const DEFAULT_PROXY_EMAIL_DOMAIN = 'auth.cuanberes.local';

function normalizeTelegramUserId(value) {
    return String(value || '').replace(/\D/g, '');
}

function normalizeDisplayName(value) {
    return String(value || '').trim();
}

function maskTelegramId(value) {
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

function buildProxyEmail(telegramUserId) {
    const domain = process.env.AUTH_PROXY_EMAIL_DOMAIN || DEFAULT_PROXY_EMAIL_DOMAIN;
    return `tg-${telegramUserId}@${domain}`;
}

function buildVerifyRedirectUrl({ purpose, redirectTo }) {
    const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const target = new URL('/verify', baseUrl);

    target.searchParams.set('purpose', purpose);
    target.searchParams.set('next', sanitizeRedirectPath(redirectTo));

    return target.toString();
}

function buildDirectVerifyUrl({ purpose, redirectTo, tokenHash, type }) {
    const target = new URL(buildVerifyRedirectUrl({ purpose, redirectTo }));

    target.searchParams.set('token_hash', tokenHash);
    target.searchParams.set('type', type || 'magiclink');

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
                
                const proxyEmail = buildProxyEmail(profile.telegram_user_id);
                
                // 1. Coba cari apakah ada user lain dengan email ini
                const { data: usersData } = await dbService.supabase.auth.admin.listUsers();
                const existingUser = usersData?.users?.find(u => u.email === proxyEmail);
                
                if (existingUser) {
                    // Update profile agar ID-nya sinkron dengan auth.user yang ada
                    const { error: updateError } = await dbService.supabase
                        .from('profiles')
                        .update({ id: existingUser.id })
                        .eq('telegram_user_id', profile.telegram_user_id);
                        
                    if (updateError) throw updateError;
                    return existingUser.email;
                }
                
                // 2. Jika benar-benar tidak ada di Auth, buat baru (ini akan butuh pendaftaran ulang via bot)
                throw new Error('Akun autentikasi Anda tidak ditemukan. Silakan lakukan pendaftaran ulang via Telegram Bot.');
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

    const proxyEmail = buildProxyEmail(profile.telegram_user_id);
    const updatePayload = {
        email: proxyEmail,
        email_confirm: true,
        user_metadata: {
            ...(authUser.user_metadata || {}),
            telegram_user_id: profile.telegram_user_id,
            telegram_username: profile.telegram_username,
            display_name: profile.display_name
        }
    };

    const { data: updatedData, error: updateError } = await dbService.supabase.auth.admin.updateUserById(profile.id, updatePayload);

    if (updateError) {
        throw updateError;
    }

    return updatedData.user.email;
}

async function requestAuthLink(input) {
    const telegramUserId = normalizeTelegramUserId(input && input.telegramUserId);
    const displayName = normalizeDisplayName(input && input.displayName);
    const purpose = String((input && input.purpose) || DEFAULT_PURPOSE).trim().toLowerCase();
    const redirectTo = sanitizeRedirectPath(input && input.redirectTo);

    if (!telegramUserId && !displayName) {
        throw new Error('Isi Telegram User ID atau nama terdaftar.');
    }

    if (!isValidAuthPurpose(purpose)) {
        throw new Error('Purpose auth tidak valid.');
    }

    let profile = null;

    if (telegramUserId) {
        profile = await dbService.getUserByTelegramId(telegramUserId);
    } else {
        const matches = await dbService.findUsersByDisplayName(displayName);

        if (matches.length > 1) {
            throw new Error('Nama terdaftar dipakai lebih dari satu akun. Gunakan Telegram User ID.');
        }

        profile = matches[0] || null;
    }

    if (!profile) {
        throw new Error('Akun belum terdaftar.');
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
    const tokenHash = properties.hashed_token || properties.hashedToken;

    if (!actionLink) {
        throw new Error('Supabase tidak mengembalikan action link.');
    }

    const resolvedActionLink = tokenHash
        ? buildDirectVerifyUrl({
            purpose,
            redirectTo,
            tokenHash,
            type: properties.verification_type || 'magiclink'
        })
        : actionLink;

    const resolvedTelegramUserId = profile.telegram_user_id;

    logger.info(`Magic link ${purpose} dibuat untuk Telegram user ${resolvedTelegramUserId}`);

    return {
        userId: profile.id,
        telegramUserId: resolvedTelegramUserId,
        maskedTelegramId: maskTelegramId(resolvedTelegramUserId),
        purpose,
        redirectTo,
        redirectUrl,
        actionLink: resolvedActionLink
    };
}

module.exports = {
    normalizeTelegramUserId,
    normalizeDisplayName,
    maskTelegramId,
    sanitizeRedirectPath,
    buildProxyEmail,
    buildVerifyRedirectUrl,
    buildDirectVerifyUrl,
    ensureAuthUserEmail,
    requestAuthLink
};
