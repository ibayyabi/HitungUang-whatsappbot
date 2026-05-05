'use client';

import { useEffect, useState } from 'react';
import {
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    Download,
    Loader2,
    MessageCircle,
    RefreshCw,
    Target,
    Wallet
} from 'lucide-react';
import { BalanceMysteryCard } from '../../components/dashboard/BalanceMysteryCard';
import { CategorySummary } from '../../components/dashboard/CategorySummary';
import { ExpenseCharts } from '../../components/dashboard/ExpenseCharts';
import { TransactionTable } from '../../components/dashboard/TransactionTable';
import { WalletSection } from '../../components/dashboard/WalletSection';
import { Button, ButtonLink, Surface } from '../../components/ui/Primitives';
import { apiClient, ApiError } from '../../lib/api-client';

const INITIAL_STATE = {
    balance: {
        todayIncome: 0,
        todayExpense: 0,
        todayRemaining: 0,
        weekIncome: 0,
        weekExpense: 0,
        todaySavings: 0,
        weekSavings: 0,
        monthIncome: 0,
        monthExpense: 0,
        monthSavings: 0,
        availableMoney: 0
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
        expense: 'bg-[#fae5ba]/70 text-[#6e5523]',
        savings: 'bg-[#edb09c]/25 text-[#7a3d2c]'
    }[tone];

    return (
        <Surface className="min-w-[85vw] shrink-0 snap-center md:min-w-0 md:shrink md:snap-none min-h-[156px] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
                <p className="p-card-title">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${toneClass}`} aria-hidden="true">
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            {loading ? (
                <div className="mt-6 h-9 w-40 animate-pulse rounded-full bg-[#efefef]" role="status" aria-label="Memuat data" />
            ) : (
                <p className="mt-6 text-3xl font-light leading-none text-black">{formatCurrency(value)}</p>
            )}
        </Surface>
    );
}

function ProfileTargetCard({ profile, loading, onSaved }) {
    const [targetExpense, setTargetExpense] = useState('');
    const [targetIncome, setTargetIncome] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setTargetExpense(profile?.target_pengeluaran_bulanan ? String(profile.target_pengeluaran_bulanan) : '');
        setTargetIncome(profile?.target_pemasukan_bulanan ? String(profile.target_pemasukan_bulanan) : '');
    }, [profile]);

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const payload = await apiClient('/api/dashboard/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    target_pengeluaran_bulanan: targetExpense ? Number(targetExpense) : null,
                    target_pemasukan_bulanan: targetIncome ? Number(targetIncome) : null
                }),
                retry: 1
            });

            setMessage('Target tersimpan.');
            onSaved();
        } catch (error) {
            const message = error instanceof ApiError
                ? error.message
                : 'Gagal menyimpan target.';
            setMessage(message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Surface className="p-5 md:p-6 animate-pulse">
                <div className="h-6 w-36 rounded bg-[#efefef]" />
                <div className="mt-5 h-24 rounded-[20px] bg-[#efefef]" />
            </Surface>
        );
    }

    return (
        <Surface className="p-5 md:p-6 transition-all duration-300">
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between text-left"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fae5ba]/70 text-[#6e5523]">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="p-card-title mb-0">Target bulanan</h2>
                        <p className="hu-meta text-xs md:text-sm">Dasar alert 80% & rekomendasi</p>
                    </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efefef] text-black transition-transform">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>
            
            {isOpen && (
                <form className="mt-5 space-y-3 animate-fade-in" onSubmit={handleSubmit}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-black">Pengeluaran Rp</label>
                        <input
                            type="number"
                            min="0"
                            className="hu-input bg-white"
                            value={targetExpense}
                            onChange={(event) => setTargetExpense(event.target.value)}
                            placeholder="5000000"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-black">Pemasukan Rp</label>
                        <input
                            type="number"
                            min="0"
                            className="hu-input bg-white"
                            value={targetIncome}
                            onChange={(event) => setTargetIncome(event.target.value)}
                            placeholder="10000000"
                        />
                    </div>
                    {message ? <p className={`rounded-[16px] p-3 text-sm ${message.includes('Gagal') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message}</p> : null}
                    <Button type="submit" disabled={saving} className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan target'}
                    </Button>
                </form>
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
            const payload = await apiClient('/api/dashboard/summary', { 
                cache: 'no-store',
                retry: 2 
            });

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
            const message = error instanceof ApiError
                ? error.message
                : 'Koneksi bermasalah. Silakan coba lagi.';
            setStatus({
                loading: false,
                message
            });
        }
    }

    useEffect(() => {
        loadSummary();
    }, []);

    async function handleExport() {
        try {
            const XLSX = await import('xlsx');
            
            const summaryData = [
                { Deskripsi: 'Total Pemasukan Bulan Ini', Jumlah: summary.balance.monthIncome },
                { Deskripsi: 'Total Pengeluaran Bulan Ini', Jumlah: summary.balance.monthExpense },
                { Deskripsi: 'Uang Tersedia (Available Money)', Jumlah: summary.balance.availableMoney },
                { Deskripsi: 'Uang Tabungan', Jumlah: summary.balance.monthSavings },
                { Deskripsi: 'Target Pengeluaran', Jumlah: summary.profile?.target_pengeluaran_bulanan || 0 },
                { Deskripsi: 'Target Pemasukan', Jumlah: summary.profile?.target_pemasukan_bulanan || 0 }
            ];
            
            const categoriesData = summary.categories.map(c => ({
                Kategori: c.kategori,
                Pemasukan: c.pemasukan || 0,
                Pengeluaran: c.pengeluaran || 0
            }));
            
            const transactionsData = summary.transactions.map(t => ({
                Tanggal: new Date(t.created_at).toLocaleString('id-ID'),
                Deskripsi: t.deskripsi,
                Jumlah: t.jumlah,
                Tipe: t.tipe,
                Kategori: t.kategori,
                Dompet: t.wallet?.jenis_dompet || 'Default'
            }));

            const wb = XLSX.utils.book_new();
            
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
            
            if (categoriesData.length > 0) {
                const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
                XLSX.utils.book_append_sheet(wb, wsCategories, "Kategori");
            }
            
            if (transactionsData.length > 0) {
                const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
                XLSX.utils.book_append_sheet(wb, wsTransactions, "Transaksi");
            }

            const fileName = `Laporan_Keuangan_CuanBeres_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error('Gagal export excel:', error);
            alert('Gagal membuat file Excel. Pastikan library xlsx terinstal.');
        }
    }

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

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleExport}
                        disabled={status.loading || !summary.transactions.length}
                        variant="secondary"
                        aria-label="Unduh Excel"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Unduh</span>
                    </Button>
                    <Button
                        type="button"
                        onClick={loadSummary}
                        disabled={status.loading}
                        variant="secondary"
                        aria-label="Perbarui data dashboard"
                    >
                        <RefreshCw className={`h-4 w-4 ${status.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        <span className="hidden sm:inline">Perbarui</span>
                    </Button>
                </div>
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

            <section className="mb-4">
                <div className="mb-4">
                    <BalanceMysteryCard balance={summary.balance} loading={status.loading} />
                </div>
                
                <div className="-mx-4 flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 hide-scrollbar md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3">
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
                        label="Available money bulan ini"
                        value={summary.balance.availableMoney}
                        icon={Wallet}
                        tone="income"
                        loading={status.loading}
                    />
                    <MetricCard
                        label="Uang tabungan bulan ini"
                        value={summary.balance.monthSavings}
                        icon={Wallet}
                        tone="savings"
                        loading={status.loading}
                    />
                    <MetricCard
                        label="Pengeluaran minggu ini"
                        value={summary.balance.weekExpense}
                        icon={CalendarDays}
                        loading={status.loading}
                    />
                </div>
            </section>

            <div className="dashboard-grid">
                <aside className="flex flex-col gap-4">
                    <ProfileTargetCard profile={summary.profile} loading={status.loading} onSaved={loadSummary} />
                    <CategorySummary categories={summary.categories} loading={status.loading} />
                    <WalletSection
                        profile={summary.profile}
                        wallets={summary.wallets}
                        availableMoney={summary.balance.availableMoney}
                        loading={status.loading}
                        onWalletCreated={loadSummary}
                    />
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
