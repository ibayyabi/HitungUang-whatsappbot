import { createClient } from '@supabase/supabase-js';
import {
    buildWhatsappChatUrl,
    dispatchWhatsappMessage,
    getBotWhatsappNumber,
    normalizeWhatsappNumber
} from './whatsapp';

function createAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Konfigurasi Supabase admin belum lengkap.');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

function buildProxyEmail(whatsappNumber) {
    return `wa-${whatsappNumber}@${process.env.AUTH_PROXY_EMAIL_DOMAIN || 'auth.cuanberes.local'}`;
}

function createBotGreeting(displayName) {
    return [
        `Halo ${displayName}, akun CuanBeres Anda sudah siap.`,
        '',
        'Mulai catat dengan pesan seperti: bakso 15rb',
        'Ketik "dashboard" untuk buka ringkasan.',
        'Kalau salah catat, ketik "hapus terakhir".'
    ].join('\n');
}

export async function startOnboarding(input) {
    const supabase = createAdminClient();
    const whatsappNumber = normalizeWhatsappNumber(input && input.whatsapp_number);
    const displayName = String((input && input.display_name) || '').trim();

    if (!whatsappNumber || whatsappNumber.length < 8 || !displayName) {
        return {
            status: 400,
            payload: {
                success: false,
                message: 'Nama dan nomor WhatsApp wajib diisi.'
            }
        };
    }

    const { data: existingProfile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id,whatsapp_number,display_name')
        .eq('whatsapp_number', whatsappNumber)
        .maybeSingle();

    if (profileLookupError) {
        throw profileLookupError;
    }

    let authUser = null;
    let isExistingUser = Boolean(existingProfile);

    if (existingProfile) {
        // Issue 7: Update display_name for existing profile if it changed
        if (existingProfile.display_name !== displayName) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ display_name: displayName })
                .eq('id', existingProfile.id);
            
            if (updateError) {
                console.error('Gagal update nama display:', updateError);
            }
        }
    } else {
        const proxyEmail = buildProxyEmail(whatsappNumber);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: proxyEmail,
            email_confirm: true,
            user_metadata: {
                whatsapp_number: whatsappNumber,
                display_name: displayName
            }
        });

        authUser = authData && authData.user;

        if (authError) {
            if (authError.message.includes('already registered')) {
                isExistingUser = true;
                const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

                if (usersError) {
                    throw usersError;
                }

                authUser = usersData?.users?.find((user) => user.email === proxyEmail);
                
                // Issue 2: Jika user "already registered" tapi tidak ditemukan di listUsers,
                // ini anomali. Jangan lanjut sukses karena profile tidak akan terbuat.
                if (!authUser) {
                    throw new Error('User terdaftar tapi data auth tidak ditemukan.');
                }
            } else {
                throw authError;
            }
        }

        if (authUser) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authUser.id,
                    whatsapp_number: whatsappNumber,
                    display_name: displayName
                });

            if (profileError) {
                throw profileError;
            }
        }
    }

    const dispatch = await dispatchWhatsappMessage({
        whatsappNumber,
        message: createBotGreeting(displayName)
    });
    const whatsappUrl = buildWhatsappChatUrl('Halo CuanBeres, saya mau mulai mencatat uang.');
    const botWhatsappNumber = getBotWhatsappNumber();

    return {
        status: 200,
        payload: {
            success: true,
            existing_user: isExistingUser,
            delivery: dispatch.sent ? 'sent' : 'manual_whatsapp',
            whatsapp_url: whatsappUrl,
            bot_whatsapp_number: botWhatsappNumber,
            message: dispatch.sent
                ? 'Akun siap. Anda bisa langsung chat bot dari tombol di bawah.'
                : 'Akun siap. Buka WhatsApp untuk mulai chat dengan bot.'
        }
    };
}
