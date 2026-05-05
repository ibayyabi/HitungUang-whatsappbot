import { createClient } from '../../../../lib/supabase/server';

function parseOptionalAmount(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : NaN;
}

export async function PATCH(request) {
    try {
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const targetPengeluaran = parseOptionalAmount(body.target_pengeluaran_bulanan);
        const targetPemasukan = parseOptionalAmount(body.target_pemasukan_bulanan);

        if (Number.isNaN(targetPengeluaran) || Number.isNaN(targetPemasukan)) {
            return Response.json({ success: false, message: 'Target harus berupa angka positif.' }, { status: 400 });
        }

        const payload = {
            target_pengeluaran_bulanan: targetPengeluaran,
            target_pemasukan_bulanan: targetPemasukan
        };

        if (typeof body.status_pekerjaan === 'string' && body.status_pekerjaan.trim()) {
            payload.status_pekerjaan = body.status_pekerjaan.trim();
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', userData.user.id)
            .select('status_pekerjaan,target_pengeluaran_bulanan,target_pemasukan_bulanan,last_alert_month')
            .single();

        if (error) throw error;

        return Response.json({ success: true, profile: data });
    } catch (error) {
        console.error('Profile update error:', error);
        return Response.json({ success: false, message: 'Gagal memperbarui target.' }, { status: 500 });
    }
}
