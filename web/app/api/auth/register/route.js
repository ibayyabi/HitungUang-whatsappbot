import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Konfigurasi Supabase admin belum lengkap.');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request) {
    try {
        const supabase = createAdminClient();
        const body = await request.json();
        const {
            telegram_user_id,
            telegram_chat_id,
            telegram_username,
            display_name
        } = body;

        if (!telegram_user_id || !display_name) {
            return Response.json({ success: false, message: 'Data tidak lengkap.' }, { status: 400 });
        }

        const normalizedTelegramUserId = String(telegram_user_id).replace(/\D/g, '');

        if (!normalizedTelegramUserId) {
            return Response.json({ success: false, message: 'Telegram User ID tidak valid.' }, { status: 400 });
        }

        const proxyEmail = `tg-${normalizedTelegramUserId}@${process.env.AUTH_PROXY_EMAIL_DOMAIN || 'auth.cuanberes.local'}`;
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: proxyEmail,
            email_confirm: true,
            user_metadata: {
                telegram_user_id: normalizedTelegramUserId,
                telegram_chat_id: telegram_chat_id ? String(telegram_chat_id) : null,
                telegram_username: telegram_username ? String(telegram_username) : null,
                display_name
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                return Response.json({ success: false, message: 'Akun Telegram sudah terdaftar. Silakan login.' }, { status: 400 });
            }
            throw authError;
        }

        const userId = authData.user.id;

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                telegram_user_id: normalizedTelegramUserId,
                telegram_chat_id: telegram_chat_id ? String(telegram_chat_id) : null,
                telegram_username: telegram_username ? String(telegram_username) : null,
                display_name
            });

        if (profileError) throw profileError;

        return Response.json({ 
            success: true, 
            message: 'Registrasi berhasil! Silakan kembali ke Telegram untuk mulai mencatat, atau login ke Dashboard.' 
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return Response.json({ success: false, message: error.message || 'Gagal melakukan registrasi.' }, { status: 500 });
    }
}
