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

    return Response.json({
        success: true,
        ...aggregateDashboardSummary(data || [])
    });
}
