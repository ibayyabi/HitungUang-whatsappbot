'use client';

import { useEffect, useState } from 'react';
import {
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    MessageCircle,
    RefreshCw,
    Wallet
} from 'lucide-react';
import { BalanceMysteryCard } from '../../components/dashboard/BalanceMysteryCard';
import { CategorySummary } from '../../components/dashboard/CategorySummary';
import { ExpenseCharts } from '../../components/dashboard/ExpenseCharts';
import { TransactionTable } from '../../components/dashboard/TransactionTable';
import { WalletSection } from '../../components/dashboard/WalletSection';
import { Button, ButtonLink, Surface } from '../../components/ui/Primitives';

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
    transactions: [],
    profile: null,
    wallets: []
};

function formatCurrency(value) {
    const number = Number(value || 0);
    const prefix = number < 0 ? '-' : '';
    return `${prefix}Rp ${Math.abs(number).toLocaleString('id-ID')}`;
}

function MetricCard({ label, value, icon: Icon, tone = 'neutral', loading }) {
    const toneClass = {
        neutral: 'bg-[#efefef] text-black',
        income: 'bg-[#75ddd1]/25 text-[#176d64]',
        expense: 'bg-[#fae5ba]/70 text-[#6e5523]'
    }[tone];

    return (
        <Surface className="min-h-[156px] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
                <p className="p-card-title">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${toneClass}`}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            {loading ? (
                <div className="mt-6 h-9 w-40 animate-pulse rounded-full bg-[#efefef]" />
            ) : (
                <p className="mt-6 text-3xl font-light leading-none text-black">{formatCurrency(value)}</p>
            )}
        </Surface>
    );
}

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
                transactions: payload.transactions || [],
                profile: payload.profile || null,
                wallets: payload.wallets || []
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

    const displayName = user.user_metadata?.display_name || user.email || 'Pengguna CuanBeres';

    return (
        <main className="site-shell animate-fade-in">
            <header className="dashboard-header">
                <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-[#636363]">
                        <MessageCircle className="h-4 w-4" />
                        <span>Ringkasan dari WhatsApp</span>
                    </div>
                    <h1 className="dashboard-title">Dashboard CuanBeres</h1>
                    <p className="mt-3 text-sm text-[#636363]">
                        Selamat datang, <span className="text-black">{displayName}</span>. Data menampilkan 90 hari terakhir.
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={loadSummary}
                    disabled={status.loading}
                    variant="secondary"
                >
                    <RefreshCw className={`h-4 w-4 ${status.loading ? 'animate-spin' : ''}`} />
                    <span>Perbarui data</span>
                </Button>
            </header>

            {status.message ? (
                <div className="mb-4 rounded-[24px] bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span>{status.message}</span>
                        <Button type="button" onClick={loadSummary} variant="secondary">
                            Coba lagi
                        </Button>
                    </div>
                </div>
            ) : null}

            <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
                <BalanceMysteryCard balance={summary.balance} loading={status.loading} />
                <MetricCard
                    label="Pemasukan hari ini"
                    value={summary.balance.todayIncome}
                    icon={ArrowUpRight}
                    tone="income"
                    loading={status.loading}
                />
                <MetricCard
                    label="Pengeluaran hari ini"
                    value={summary.balance.todayExpense}
                    icon={ArrowDownRight}
                    tone="expense"
                    loading={status.loading}
                />
                <MetricCard
                    label="Pengeluaran minggu ini"
                    value={summary.balance.weekExpense}
                    icon={CalendarDays}
                    loading={status.loading}
                />
            </section>

            <div className="dashboard-grid">
                <aside className="flex flex-col gap-4">
                    <CategorySummary categories={summary.categories} loading={status.loading} />
                    <WalletSection profile={summary.profile} wallets={summary.wallets} loading={status.loading} onWalletCreated={loadSummary} />
                    <Surface className="p-5 md:p-6">
                        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#efefef] text-black">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <h2 className="hu-subheading">Mulai dari chat.</h2>
                        <p className="hu-body mt-3 text-sm">
                            Belum ada data? Kirim transaksi pertama lewat WhatsApp, lalu perbarui dashboard.
                        </p>
                        <ButtonLink href="https://wa.me/628123456789" variant="secondary" className="mt-5 w-full" external>
                            Buka WhatsApp
                        </ButtonLink>
                    </Surface>
                </aside>

                <div className="flex flex-col gap-4">
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
