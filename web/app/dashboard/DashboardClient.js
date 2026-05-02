'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { BalanceMysteryCard } from '../../components/dashboard/BalanceMysteryCard';
import { CategorySummary } from '../../components/dashboard/CategorySummary';
import { ExpenseCharts } from '../../components/dashboard/ExpenseCharts';
import { TransactionTable } from '../../components/dashboard/TransactionTable';

const INITIAL_STATE = {
    balance: {
        todayIncome: 0,
        todayExpense: 0,
        todayRemaining: 0,
        weekIncome: 0,
        weekExpense: 0
    },
    dailySeries: [],
    weeklySeries: [],
    categories: [],
    transactions: []
};

export default function DashboardClient({ user }) {
    const [summary, setSummary] = useState(INITIAL_STATE);
    const [status, setStatus] = useState({
        loading: true,
        message: ''
    });

    async function loadSummary() {
        setStatus({ loading: true, message: '' });

        try {
            const response = await fetch('/api/dashboard/summary', {
                cache: 'no-store'
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Gagal memuat dashboard.');
            }

            setSummary({
                balance: payload.balance || INITIAL_STATE.balance,
                dailySeries: payload.dailySeries || [],
                weeklySeries: payload.weeklySeries || [],
                categories: payload.categories || [],
                transactions: payload.transactions || []
            });
            setStatus({ loading: false, message: '' });
        } catch (error) {
            setStatus({
                loading: false,
                message: error instanceof Error ? error.message : 'Gagal memuat dashboard.'
            });
        }
    }

    useEffect(() => {
        loadSummary();
    }, []);

    const displayName = user.user_metadata?.display_name || user.email || 'CuanBeres User';

    return (
        <main className="site-shell animate-fade-in">
            <header className="dashboard-header">
                <div>
                    <div className="flex items-center gap-2 text-emerald-700 mb-1">
                        <LayoutDashboard size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Premium Intelligence</span>
                    </div>
                    <h1 className="dashboard-title">Ringkasan uang dari Telegram</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Selamat datang kembali, <span className="text-slate-900">{displayName}</span>
                    </p>
                </div>
                
                <button
                    type="button"
                    onClick={loadSummary}
                    disabled={status.loading}
                    className="p-button p-button-outline"
                >
                    <RefreshCw className={`h-4 w-4 ${status.loading ? 'animate-spin' : ''}`} />
                    <span>Perbarui Data</span>
                </button>
            </header>

            {status.message ? (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700 flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    {status.message}
                </div>
            ) : null}

            <div className="dashboard-grid">
                {/* Left Sidebar: Key Metrics & Categories */}
                <aside className="flex flex-col gap-6">
                    <BalanceMysteryCard balance={summary.balance} loading={status.loading} />
                    <CategorySummary categories={summary.categories} loading={status.loading} />
                </aside>

                {/* Main Content: Charts & History */}
                <div className="flex flex-col gap-6">
                    <ExpenseCharts
                        dailySeries={summary.dailySeries}
                        weeklySeries={summary.weeklySeries}
                        loading={status.loading}
                    />
                    <TransactionTable transactions={summary.transactions} loading={status.loading} />
                </div>
            </div>
        </main>
    );
}
