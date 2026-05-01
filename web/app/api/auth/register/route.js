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
        const { whatsapp_number, display_name } = body;

        if (!whatsapp_number || !display_name) {
            return Response.json({ success: false, message: 'Data tidak lengkap.' }, { status: 400 });
        }

        // 1. Buat user di Auth (Admin)
        // Kita gunakan password acak atau biarkan kosong (magic link only)
        const proxyEmail = `wa-${whatsapp_number}@${process.env.AUTH_PROXY_EMAIL_DOMAIN || 'auth.cuanberes.local'}`;
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: proxyEmail,
            email_confirm: true,
            user_metadata: { whatsapp_number, display_name }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                return Response.json({ success: false, message: 'Nomor WhatsApp sudah terdaftar. Silakan login.' }, { status: 400 });
            }
            throw authError;
        }

        const userId = authData.user.id;

        // 2. Buat profil di database (Biasanya ada trigger, tapi kita pastikan di sini)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                whatsapp_number: whatsapp_number,
                display_name: display_name
            });

        if (profileError) throw profileError;

        return Response.json({ 
            success: true, 
            message: 'Registrasi berhasil! Silakan kembali ke WhatsApp untuk mulai mencatat, atau login ke Dashboard.' 
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return Response.json({ success: false, message: error.message || 'Gagal melakukan registrasi.' }, { status: 500 });
    }
}
