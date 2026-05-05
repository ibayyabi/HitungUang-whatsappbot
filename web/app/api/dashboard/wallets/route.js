import { createClient } from '../../../../lib/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            nama_dompet,
            target_nominal,
            jenis_dompet = 'custom',
            priority_rank = null,
            monthly_target = null,
            is_default_income_wallet = false
        } = body;

        const normalizedName = typeof nama_dompet === 'string' ? nama_dompet.trim() : '';
        const targetAmount = Number(target_nominal);
        const monthlyTarget = monthly_target === null || monthly_target === '' ? null : Number(monthly_target);
        const priorityRank = priority_rank === null || priority_rank === '' ? null : Number(priority_rank);

        if (!normalizedName || !Number.isFinite(targetAmount) || targetAmount <= 0) {
            return Response.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
        }

        if ((monthlyTarget !== null && (!Number.isFinite(monthlyTarget) || monthlyTarget < 0)) ||
            (priorityRank !== null && (!Number.isInteger(priorityRank) || priorityRank <= 0))) {
            return Response.json({ success: false, message: 'Data dompet tidak valid.' }, { status: 400 });
        }

        const { data: duplicate, error: duplicateError } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', userData.user.id)
            .is('archived_at', null)
            .ilike('nama_dompet', normalizedName)
            .limit(1);

        if (duplicateError) throw duplicateError;
        if (duplicate && duplicate.length > 0) {
            return Response.json({ success: false, message: 'Nama dompet sudah dipakai.' }, { status: 409 });
        }

        if (is_default_income_wallet) {
            const { error: unsetError } = await supabase
                .from('wallets')
                .update({ is_default_income_wallet: false })
                .eq('user_id', userData.user.id);

            if (unsetError) throw unsetError;
        }

        const { data, error } = await supabase
            .from('wallets')
            .insert([{
                user_id: userData.user.id,
                nama_dompet: normalizedName,
                target_nominal: Math.round(targetAmount),
                terkumpul: 0,
                jenis_dompet,
                priority_rank: priorityRank,
                monthly_target: monthlyTarget === null ? null : Math.round(monthlyTarget),
                is_default_income_wallet: Boolean(is_default_income_wallet)
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
