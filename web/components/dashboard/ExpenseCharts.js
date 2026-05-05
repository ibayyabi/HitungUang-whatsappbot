'use client';

import { memo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function hasChartData(data) {
    return data.some((item) => Number(item.pengeluaran || 0) !== 0 || Number(item.pemasukan || 0) !== 0);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="rounded-[18px] bg-white p-3 shadow-[var(--shadow-sm)]">
            <p className="mb-2 text-xs font-medium text-[#636363]">{label}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-3 py-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-sm text-[#636363]">{entry.name}</span>
                    <span className="ml-auto text-sm font-medium text-black">{formatCurrency(entry.value)}</span>
                </div>
            ))}
        </div>
    );
};

function EmptyChart() {
    return (
        <div className="flex h-64 flex-col items-center justify-center rounded-[24px] bg-gradient-to-br from-[#f8f8f8] to-white p-6 text-center animate-fade-in">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#75ddd1]/20">
                <BarChart3 className="h-7 w-7 text-[#176d64]" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-black">Belum ada data grafik.</p>
            <p className="hu-body mt-2 text-sm">Kirim transaksi dari WhatsApp untuk melihat tren.</p>
        </div>
    );
}

function ChartBlock({ title, data, xKey }) {
    const empty = !hasChartData(data);

    return (
        <div className="p-card flex min-h-[340px] flex-col">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <h2 className="p-card-title mb-0">{title}</h2>
                    <p className="hu-meta">Pemasukan dan pengeluaran</p>
                </div>
            </div>

            {empty ? (
                <EmptyChart />
            ) : (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="#efefef" vertical={false} />
                            <XAxis
                                dataKey={xKey}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fontWeight: 400, fill: '#636363' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fontWeight: 400, fill: '#636363' }}
                                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f8f8' }} />
                            <Bar
                                name="Pengeluaran"
                                dataKey="pengeluaran"
                                fill="#edb09c"
                                radius={[10, 10, 0, 0]}
                                barSize={28}
                            />
                            <Bar
                                name="Pemasukan"
                                dataKey="pemasukan"
                                fill="#75ddd1"
                                radius={[10, 10, 0, 0]}
                                barSize={28}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

export const ExpenseCharts = memo(function ExpenseCharts({ dailySeries, weeklySeries, loading }) {
    if (loading) {
        return (
            <div className="chart-grid">
                <div className="h-[340px] animate-pulse rounded-[30px] bg-[#efefef]" />
                <div className="h-[340px] animate-pulse rounded-[30px] bg-[#efefef]" />
            </div>
        );
    }

    return (
        <section className="chart-grid">
            <ChartBlock title="Tren harian" data={dailySeries} xKey="date" />
            <ChartBlock title="Tren mingguan" data={weeklySeries} xKey="week" />
        </section>
    );
});
