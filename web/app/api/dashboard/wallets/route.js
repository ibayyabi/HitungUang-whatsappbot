import { createClient } from '../../../../lib/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { nama_dompet, target_nominal } = body;

        if (!nama_dompet || typeof target_nominal !== 'number') {
            return Response.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('wallets')
            .insert([{
                user_id: userData.user.id,
                nama_dompet: nama_dompet.trim(),
                target_nominal,
                terkumpul: 0
            }])
            .select()
            .single();

        if (error) throw error;

        return Response.json({ success: true, wallet: data });
    } catch (error) {
        console.error('Wallet creation error:', error);
        return Response.json({ success: false, message: 'Gagal membuat dompet tabungan.' }, { status: 500 });
    }
}
