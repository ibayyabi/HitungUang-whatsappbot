'use client';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function ChartBlock({ title, data, xKey }) {
    return (
        <div className="min-h-80 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function ExpenseCharts({ dailySeries, weeklySeries, loading }) {
    if (loading) {
        return (
            <section className="grid gap-4 xl:grid-cols-2">
                <div className="h-80 animate-pulse rounded-lg bg-white" />
                <div className="h-80 animate-pulse rounded-lg bg-white" />
            </section>
        );
    }

    return (
        <section className="grid gap-4 xl:grid-cols-2">
            <ChartBlock title="Pengeluaran Harian" data={dailySeries} xKey="date" />
            <ChartBlock title="Pengeluaran Mingguan" data={weeklySeries} xKey="week" />
        </section>
    );
}
