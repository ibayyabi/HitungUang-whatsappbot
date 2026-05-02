'use client';

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

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3 py-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-semibold text-slate-700">{entry.name}:</span>
                        <span className="text-sm font-bold text-slate-900 ml-auto">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

function ChartBlock({ title, data, xKey }) {
    return (
        <div className="p-card flex flex-col">
            <h2 className="p-card-title">{title}</h2>
            <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                            dataKey={xKey} 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
                            tickFormatter={(value) => `${Math.round(value / 1000)}k`} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar 
                            name="Pengeluaran"
                            dataKey="pengeluaran" 
                            fill="#ef4444" 
                            radius={[6, 6, 0, 0]} 
                            barSize={32}
                        />
                        <Bar 
                            name="Pemasukan"
                            dataKey="pemasukan" 
                            fill="#10b981" 
                            radius={[6, 6, 0, 0]} 
                            barSize={32}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function ExpenseCharts({ dailySeries, weeklySeries, loading }) {
    if (loading) {
        return (
            <div className="chart-grid">
                <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
            </div>
        );
    }

    return (
        <section className="chart-grid">
            <ChartBlock title="Aliran Kas Harian" data={dailySeries} xKey="date" />
            <ChartBlock title="Aliran Kas Mingguan" data={weeklySeries} xKey="week" />
        </section>
    );
}
