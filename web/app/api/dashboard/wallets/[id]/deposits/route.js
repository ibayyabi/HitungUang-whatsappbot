import { createClient } from '../../../../../../lib/supabase/server';

export async function POST(request, context) {
    try {
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const amount = Number(body.amount);
        const note = typeof body.note === 'string' ? body.note.trim() : '';

        if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json({ success: false, message: 'Nominal setoran harus lebih dari 0.' }, { status: 400 });
        }

        const { data, error } = await supabase.rpc('deposit_wallet_saving', {
            p_wallet_id: id,
            p_user_id: userData.user.id,
            p_amount: Math.round(amount),
            p_note: note || null
        });

        if (error) {
            if (String(error.message || '').includes('available money insufficient')) {
                return Response.json({
                    success: false,
                    message: 'Available money bulan ini belum cukup. Catat pemasukan dulu atau kurangi nominal setoran.'
                }, { status: 409 });
            }

            throw error;
        }

        return Response.json({ success: true, wallet: data });
    } catch (error) {
        console.error('Wallet deposit error:', error);
        return Response.json({ success: false, message: 'Gagal mengisi dompet.' }, { status: 500 });
    }
}
