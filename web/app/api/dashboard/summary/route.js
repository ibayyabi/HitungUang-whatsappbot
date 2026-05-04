import dashboardSummary from '../../../../../shared/contracts/dashboardSummary';
import { createClient } from '../../../../lib/supabase/server';

const { aggregateDashboardSummary } = dashboardSummary;

const SELECT_FIELDS = 'id,item,harga,kategori,lokasi,catatan_asli,tanggal,tipe,created_at';

function daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
}

export async function GET() {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
        return Response.json({
            success: false,
            message: 'Unauthorized'
        }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('transactions')
        .select(SELECT_FIELDS)
        .gte('tanggal', daysAgo(90))
        .order('tanggal', { ascending: false })
        .limit(250);

    if (error) {
        return Response.json({
            success: false,
            message: 'Gagal mengambil data dashboard.'
        }, { status: 500 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('status_pekerjaan, target_pengeluaran_bulanan, target_pemasukan_bulanan')
        .eq('id', userData.user.id)
        .single();

    const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

    return Response.json({
        success: true,
        profile: profile || null,
        wallets: wallets || [],
        ...aggregateDashboardSummary(data || [])
    });
}
