import { createClient } from '../../../../../lib/supabase/server';

function parseOptionalAmount(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : NaN;
}

function parseOptionalRank(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const rank = Number(value);
    return Number.isInteger(rank) && rank > 0 ? rank : NaN;
}

export async function PATCH(request, context) {
    try {
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const payload = {};

        if (typeof body.nama_dompet === 'string') {
            const name = body.nama_dompet.trim();
            if (!name) {
                return Response.json({ success: false, message: 'Nama dompet wajib diisi.' }, { status: 400 });
            }

            const { data: duplicate, error: duplicateError } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', userData.user.id)
                .is('archived_at', null)
                .ilike('nama_dompet', name)
                .neq('id', id)
                .limit(1);

            if (duplicateError) throw duplicateError;
            if (duplicate && duplicate.length > 0) {
                return Response.json({ success: false, message: 'Nama dompet sudah dipakai.' }, { status: 409 });
            }

            payload.nama_dompet = name;
        }

        if ('target_nominal' in body) {
            const target = parseOptionalAmount(body.target_nominal);
            if (Number.isNaN(target) || target <= 0) {
                return Response.json({ success: false, message: 'Target dompet harus lebih dari 0.' }, { status: 400 });
            }
            payload.target_nominal = target;
        }

        if ('monthly_target' in body) {
            const monthlyTarget = parseOptionalAmount(body.monthly_target);
            if (Number.isNaN(monthlyTarget)) {
                return Response.json({ success: false, message: 'Target bulanan tidak valid.' }, { status: 400 });
            }
            payload.monthly_target = monthlyTarget;
        }

        if ('priority_rank' in body) {
            const rank = parseOptionalRank(body.priority_rank);
            if (Number.isNaN(rank)) {
                return Response.json({ success: false, message: 'Prioritas harus angka positif.' }, { status: 400 });
            }
            payload.priority_rank = rank;
        }

        if (typeof body.jenis_dompet === 'string' && body.jenis_dompet.trim()) {
            payload.jenis_dompet = body.jenis_dompet.trim();
        }

        if (typeof body.is_default_income_wallet === 'boolean') {
            payload.is_default_income_wallet = body.is_default_income_wallet;
            if (body.is_default_income_wallet) {
                const { error: unsetError } = await supabase
                    .from('wallets')
                    .update({ is_default_income_wallet: false })
                    .eq('user_id', userData.user.id)
                    .neq('id', id);

                if (unsetError) throw unsetError;
            }
        }

        if (body.archive === true) {
            payload.archived_at = new Date().toISOString();
            payload.is_default_income_wallet = false;
        }

        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('wallets')
            .update(payload)
            .eq('id', id)
            .eq('user_id', userData.user.id)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ success: true, wallet: data });
    } catch (error) {
        console.error('Wallet update error:', error);
        return Response.json({ success: false, message: 'Gagal memperbarui dompet.' }, { status: 500 });
    }
}
