import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import DashboardClient from './DashboardClient';

export const metadata = {
    title: 'Dashboard | CuanBeres',
    description: 'Ringkasan transaksi CuanBeres dari WhatsApp.'
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        redirect('/login');
    }

    return <DashboardClient user={data.user} />;
}
