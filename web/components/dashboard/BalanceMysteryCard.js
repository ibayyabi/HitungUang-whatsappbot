import { ArrowDownRight, ArrowUpRight, WalletCards } from 'lucide-react';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function getBalanceState(value) {
    if (value > 0) return { label: 'Masih aman', className: 'bg-emerald-100 text-emerald-800' };
    if (value === 0) return { label: 'Pas-pasan', className: 'bg-amber-100 text-amber-800' };
    return { label: 'Bocor hari ini', className: 'bg-red-100 text-red-800' };
}

export function BalanceMysteryCard({ balance, loading }) {
    const state = getBalanceState(Number(balance.todayRemaining || 0));

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500">Misteri Saldo</p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-950">
                        {loading ? 'Memuat...' : formatCurrency(balance.todayRemaining)}
                    </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <WalletCards className="h-5 w-5" />
                </div>
            </div>

            <span className={`mt-4 inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${state.className}`}>
                {state.label}
            </span>

            <div className="mt-6 grid gap-3">
                <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        Pemasukan hari ini
                    </span>
                    <strong className="text-sm text-slate-950">{formatCurrency(balance.todayIncome)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                        Pengeluaran hari ini
                    </span>
                    <strong className="text-sm text-slate-950">{formatCurrency(balance.todayExpense)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-600">Pengeluaran minggu ini</span>
                    <strong className="text-sm text-slate-950">{formatCurrency(balance.weekExpense)}</strong>
                </div>
            </div>
        </section>
    );
}
