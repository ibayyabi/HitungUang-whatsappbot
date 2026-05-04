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
            display_name,
            status_pekerjaan,
            target_pengeluaran_bulanan,
            target_pemasukan_bulanan
        } = body;

        if (!telegram_user_id || !display_name) {
            return Response.json({ success: false, message: 'Data tidak lengkap.' }, { status: 400 });
        }

        const normalizedTelegramUserId = String(telegram_user_id).replace(/\D/g, '');

        if (!normalizedTelegramUserId) {
            return Response.json({ success: false, message: 'Nomor WhatsApp tidak valid.' }, { status: 400 });
        }

        const proxyEmail = `tg-${normalizedTelegramUserId}@${process.env.AUTH_PROXY_EMAIL_DOMAIN || 'auth.cuanberes.local'}`;
        
        let authData = null;
        let authError = null;

        const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
            email: proxyEmail,
            email_confirm: true,
            user_metadata: {
                telegram_user_id: normalizedTelegramUserId,
                telegram_chat_id: telegram_chat_id ? String(telegram_chat_id) : null,
                telegram_username: telegram_username ? String(telegram_username) : null,
                display_name,
                status_pekerjaan,
                target_pengeluaran_bulanan,
                target_pemasukan_bulanan
            }
        });

        authData = createdData;
        authError = createError;

        if (authError && (authError.code === 'email_exists' || authError.message?.includes('already registered'))) {
            const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
            if (!listError) {
                const existingUser = usersData.users.find(u => u.email === proxyEmail);
                if (existingUser) {
                    authData = { user: existingUser };
                    authError = null;
                }
            }
        }

        if (authError) throw authError;

        const userId = authData.user.id;

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                telegram_user_id: normalizedTelegramUserId,
                telegram_chat_id: telegram_chat_id ? String(telegram_chat_id) : null,
                telegram_username: telegram_username ? String(telegram_username) : null,
                display_name,
                status_pekerjaan,
                target_pengeluaran_bulanan,
                target_pemasukan_bulanan
            });

        if (profileError) throw profileError;

        // Kirim pesan onboarding via WhatsApp (Fonnte)
        try {
            const fonnteModule = await import('../../../../../src/services/fonnteService');
            const fonnteService = fonnteModule.default || fonnteModule;
            
            const onboardingMessage = `Halo ${display_name || 'Kak'}! Selamat bergabung di HitungUang 🚀.\n\nSekarang kamu bisa langsung mencatat transaksi lewat sini. Cukup ketik saja seperti biasa, contoh:\n- *makan siang 25rb*\n- *pemasukan gaji 5jt*\n\nKetik *'dashboard'* kapan saja untuk mendapatkan link masuk ke halaman web. Selamat mengelola keuangan! 💰`;
            
            await fonnteService.sendMessage({
                target: normalizedTelegramUserId,
                message: onboardingMessage
            });
        } catch (msgError) {
            console.error('Gagal mengirim pesan onboarding:', msgError.message);
        }

        return Response.json({ 
            success: true, 
            message: 'Registrasi berhasil! Pesan sambutan telah dikirim ke WhatsApp Anda.' 
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return Response.json({ success: false, message: error.message || 'Gagal melakukan registrasi.' }, { status: 500 });
    }
}
