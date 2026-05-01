'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
        <main className="min-h-screen bg-slate-50 text-slate-950">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">CuanBeres Dashboard</p>
                        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Ringkasan uang dari WhatsApp</h1>
                        <p className="mt-1 text-sm text-slate-500">{displayName}</p>
                    </div>
                    <button
                        type="button"
                        onClick={loadSummary}
                        disabled={status.loading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${status.loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </header>

                {status.message ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {status.message}
                    </div>
                ) : null}

                <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <BalanceMysteryCard balance={summary.balance} loading={status.loading} />
                    <ExpenseCharts
                        dailySeries={summary.dailySeries}
                        weeklySeries={summary.weeklySeries}
                        loading={status.loading}
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <CategorySummary categories={summary.categories} loading={status.loading} />
                    <TransactionTable transactions={summary.transactions} loading={status.loading} />
                </section>
            </div>
        </main>
    );
}
