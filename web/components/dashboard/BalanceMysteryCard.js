import { ArrowDownRight, ArrowUpRight, Wallet, TrendingDown, TrendingUp } from 'lucide-react';

function formatCurrency(value) {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = `Rp ${absValue.toLocaleString('id-ID')}`;
    return isNegative ? `-${formatted}` : formatted;
}

function getStatusConfig(value) {
    if (value > 0) return { 
        label: 'Surplus hari ini', 
        badgeClass: 'p-badge-success',
        icon: <TrendingUp className="h-4 w-4" />,
        accentClass: 'text-emerald-600'
    };
    if (value === 0) return { 
        label: 'Seimbang', 
        badgeClass: 'p-badge-warning',
        icon: <TrendingUp className="h-4 w-4" />,
        accentClass: 'text-amber-600'
    };
    return { 
        label: 'Defisit hari ini', 
        badgeClass: 'p-badge-danger',
        icon: <TrendingDown className="h-4 w-4" />,
        accentClass: 'text-red-600'
    };
}

export function BalanceMysteryCard({ balance, loading }) {
    const remaining = Number(balance.todayRemaining || 0);
    const config = getStatusConfig(remaining);

    return (
        <section className="p-card">
            <header className="flex items-center justify-between mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Wallet size={20} />
                </div>
                <span className={`p-badge ${config.badgeClass} flex items-center gap-1.5`}>
                    {config.icon}
                    {config.label}
                </span>
            </header>

            <div>
                <p className="p-card-title">Sisa Anggaran Hari Ini</p>
                <h2 className={`text-3xl font-bold tracking-tight ${remaining < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {loading ? (
                        <div className="h-9 w-48 animate-pulse bg-slate-100 rounded-md" />
                    ) : formatCurrency(remaining)}
                </h2>
            </div>

            <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:bg-white hover:border-emerald-200 group">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <ArrowUpRight size={14} />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">Pemasukan</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">{formatCurrency(balance.todayIncome)}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:bg-white hover:border-red-200 group">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <ArrowDownRight size={14} />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">Pengeluaran</span>
                    </div>
                    <span className="text-sm font-bold text-red-700">{formatCurrency(balance.todayExpense)}</span>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-500">Total Minggu Ini</span>
                    <span className="font-bold text-slate-900">{formatCurrency(balance.weekExpense)}</span>
                </div>
            </div>
        </section>
    );
}
