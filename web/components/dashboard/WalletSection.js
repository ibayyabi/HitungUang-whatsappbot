import { useState } from 'react';
import { ArrowDownToLine, Lightbulb, Loader2, Plus, Settings, Wallet } from 'lucide-react';
import { Button, Surface } from '../ui/Primitives';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function emptyWalletForm(targetAmount = '') {
    return {
        nama_dompet: 'Dana Darurat',
        target_nominal: targetAmount ? String(targetAmount) : '',
        jenis_dompet: 'dana_darurat',
        priority_rank: '',
        monthly_target: '',
        is_default_income_wallet: false
    };
}

function buildWalletForm(wallet) {
    return {
        nama_dompet: wallet.nama_dompet || '',
        target_nominal: wallet.target_nominal ? String(wallet.target_nominal) : '',
        jenis_dompet: wallet.jenis_dompet || 'custom',
        priority_rank: wallet.priority_rank ? String(wallet.priority_rank) : '',
        monthly_target: wallet.monthly_target ? String(wallet.monthly_target) : '',
        is_default_income_wallet: Boolean(wallet.is_default_income_wallet)
    };
}

function getSuggestedEmergencyTarget(profile) {
    if (!profile || !profile.target_pengeluaran_bulanan) return 0;
    const status = String(profile.status_pekerjaan || '').toLowerCase();
    const multiplier = status === 'wirausaha' || status === 'freelance' ? 6 : 3;
    return Number(profile.target_pengeluaran_bulanan) * multiplier;
}

export function WalletSection({ profile, wallets, availableMoney = 0, loading, onWalletCreated }) {
    const suggestedAmount = getSuggestedEmergencyTarget(profile);
    const [mode, setMode] = useState('idle');
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [walletForm, setWalletForm] = useState(emptyWalletForm(suggestedAmount));
    const [depositForm, setDepositForm] = useState({ amount: '', note: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const activeWallets = Array.isArray(wallets) ? wallets : [];
    const priorityWallet = activeWallets[0] || null;

    if (loading) {
        return (
            <Surface className="p-5 md:p-6 animate-pulse">
                <div className="h-6 w-32 bg-[#efefef] rounded mb-4" />
                <div className="h-24 bg-[#efefef] rounded-xl" />
            </Surface>
        );
    }

    function resetState() {
        setMode('idle');
        setSelectedWallet(null);
        setDepositForm({ amount: '', note: '' });
        setWalletForm(emptyWalletForm(suggestedAmount));
        setMessage('');
    }

    function openCreate() {
        setMode('create');
        setSelectedWallet(null);
        setWalletForm(emptyWalletForm(suggestedAmount));
        setMessage('');
    }

    function openEdit(wallet) {
        setMode('edit');
        setSelectedWallet(wallet);
        setWalletForm(buildWalletForm(wallet));
        setMessage('');
    }

    function openDeposit(wallet) {
        setMode('deposit');
        setSelectedWallet(wallet);
        setDepositForm({
            amount: wallet.recommendedMonthlyAmount ? String(wallet.recommendedMonthlyAmount) : '',
            note: ''
        });
        setMessage('');
    }

    async function submitWalletForm(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        const payload = {
            nama_dompet: walletForm.nama_dompet,
            target_nominal: Number(walletForm.target_nominal),
            jenis_dompet: walletForm.jenis_dompet,
            priority_rank: walletForm.priority_rank ? Number(walletForm.priority_rank) : null,
            monthly_target: walletForm.monthly_target ? Number(walletForm.monthly_target) : null,
            is_default_income_wallet: walletForm.is_default_income_wallet
        };

        try {
            const response = await fetch(mode === 'edit' ? `/api/dashboard/wallets/${selectedWallet.id}` : '/api/dashboard/wallets', {
                method: mode === 'edit' ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal menyimpan dompet.');
            }

            resetState();
            onWalletCreated();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal menyimpan dompet.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function submitDeposit(event) {
        event.preventDefault();
        if (!selectedWallet) return;

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await fetch(`/api/dashboard/wallets/${selectedWallet.id}/deposits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(depositForm.amount),
                    note: depositForm.note
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengisi dompet.');
            }

            resetState();
            onWalletCreated();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal mengisi dompet.');
        } finally {
            setIsSubmitting(false);
        }
    }

    function renderWalletForm() {
        return (
            <form onSubmit={submitWalletForm} className="space-y-4 rounded-[20px] bg-[#f9f9f9] p-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Nama dompet</label>
                    <input
                        type="text"
                        className="hu-input bg-white w-full"
                        value={walletForm.nama_dompet}
                        onChange={(event) => setWalletForm((current) => ({ ...current, nama_dompet: event.target.value }))}
                        required
                    />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Target Rp</label>
                        <input
                            type="number"
                            min="1"
                            className="hu-input bg-white w-full"
                            value={walletForm.target_nominal}
                            onChange={(event) => setWalletForm((current) => ({ ...current, target_nominal: event.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Setoran/bulan Rp</label>
                        <input
                            type="number"
                            min="0"
                            className="hu-input bg-white w-full"
                            value={walletForm.monthly_target}
                            onChange={(event) => setWalletForm((current) => ({ ...current, monthly_target: event.target.value }))}
                        />
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Jenis</label>
                        <select
                            className="hu-input bg-white w-full"
                            value={walletForm.jenis_dompet}
                            onChange={(event) => setWalletForm((current) => ({ ...current, jenis_dompet: event.target.value }))}
                        >
                            <option value="dana_darurat">Dana Darurat</option>
                            <option value="liburan">Liburan</option>
                            <option value="pendidikan">Pendidikan</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Prioritas</label>
                        <input
                            type="number"
                            min="1"
                            className="hu-input bg-white w-full"
                            value={walletForm.priority_rank}
                            onChange={(event) => setWalletForm((current) => ({ ...current, priority_rank: event.target.value }))}
                            placeholder="1"
                        />
                    </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-[#636363]">
                    <input
                        type="checkbox"
                        checked={walletForm.is_default_income_wallet}
                        onChange={(event) => setWalletForm((current) => ({ ...current, is_default_income_wallet: event.target.checked }))}
                    />
                    Default alokasi pemasukan
                </label>
                {message ? <p className="rounded-[16px] bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetState} className="flex-1">
                        Batal
                    </Button>
                </div>
            </form>
        );
    }

    function renderDepositForm() {
        if (!selectedWallet) return null;
        const requestedAmount = Number(depositForm.amount || 0);
        const insufficientFunds = requestedAmount > Number(availableMoney || 0);

        return (
            <form onSubmit={submitDeposit} className="space-y-4 rounded-[20px] bg-[#f9f9f9] p-4">
                <div>
                    <p className="text-sm text-[#636363]">Isi dompet</p>
                    <h3 className="text-lg font-medium text-black">{selectedWallet.nama_dompet}</h3>
                    <p className="mt-2 rounded-[16px] bg-white p-3 text-sm text-[#636363]">
                        Available money bulan ini: <b className="text-black">{formatCurrency(availableMoney)}</b>
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Nominal Rp</label>
                    <input
                        type="number"
                        min="1"
                        className="hu-input bg-white w-full"
                        value={depositForm.amount}
                        onChange={(event) => setDepositForm((current) => ({ ...current, amount: event.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Catatan</label>
                    <input
                        type="text"
                        className="hu-input bg-white w-full"
                        value={depositForm.note}
                        onChange={(event) => setDepositForm((current) => ({ ...current, note: event.target.value }))}
                        placeholder="Setoran bulan ini"
                    />
                </div>
                {insufficientFunds ? (
                    <p className="rounded-[16px] bg-[#fae5ba]/70 p-3 text-sm text-[#6e5523]">
                        Nominal ini melebihi available money bulan ini. Catat pemasukan dulu atau kurangi nominal setoran.
                    </p>
                ) : null}
                {message ? <p className="rounded-[16px] bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting || insufficientFunds} className="flex-1">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Isi'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetState} className="flex-1">
                        Batal
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <Surface className="p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="hu-subheading flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#176d64]" />
                    Dompet Tabungan
                </h2>
                {mode === 'idle' ? (
                    <button onClick={openCreate} className="flex items-center gap-1 text-sm font-medium text-[#176d64] hover:underline">
                        <Plus className="h-4 w-4" /> Tambah
                    </button>
                ) : null}
            </div>

            {mode === 'create' || mode === 'edit' ? renderWalletForm() : null}
            {mode === 'deposit' ? renderDepositForm() : null}

            {mode === 'idle' && activeWallets.length > 0 ? (
                <div className="space-y-4">
                    {priorityWallet ? (
                        <div className="rounded-[20px] bg-[#f0fdfa] p-4">
                            <p className="text-xs font-medium uppercase text-[#0f766e]">Prioritas isi berikutnya</p>
                            <div className="mt-2 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-medium text-black">{priorityWallet.nama_dompet}</h3>
                                    <p className="mt-1 text-sm text-[#0f766e]/80">{priorityWallet.priorityReason}</p>
                                </div>
                                <Button type="button" onClick={() => openDeposit(priorityWallet)} className="min-w-0 px-3">
                                    <ArrowDownToLine className="h-4 w-4" />
                                    Isi
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {activeWallets.map((wallet) => {
                            const progress = Number(wallet.progress || 0);
                            return (
                                <article key={wallet.id} className="rounded-[20px] bg-[#f9f9f9] p-4">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-medium text-black">{wallet.nama_dompet}</h3>
                                            <p className="mt-1 text-xs text-[#636363]">{wallet.priorityReason}</p>
                                        </div>
                                        <span className="rounded-full bg-[#75ddd1]/25 px-2 py-1 text-xs font-semibold text-[#176d64]">
                                            {progress}%
                                        </span>
                                    </div>
                                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#efefef]">
                                        <div
                                            className="h-full rounded-full bg-[#176d64] transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="grid gap-1 text-xs text-[#636363]">
                                        <span>Terkumpul: <b className="text-black">{formatCurrency(wallet.terkumpul)}</b></span>
                                        <span>Target: {formatCurrency(wallet.target_nominal)}</span>
                                        {wallet.recommendedMonthlyAmount > 0 ? (
                                            <span>Setoran disarankan: {formatCurrency(wallet.recommendedMonthlyAmount)}</span>
                                        ) : null}
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button type="button" onClick={() => openDeposit(wallet)} className="min-w-0 flex-1">
                                            <ArrowDownToLine className="h-4 w-4" />
                                            Isi
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => openEdit(wallet)} className="min-w-0 flex-1">
                                            <Settings className="h-4 w-4" />
                                            Atur
                                        </Button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {mode === 'idle' && activeWallets.length === 0 ? (
                <div className="rounded-[24px] border border-[#ccfbf1] bg-[#f0fdfa] p-4">
                    <div className="mb-3 flex gap-3">
                        <div className="h-fit rounded-full bg-white p-2 text-[#0d9488]">
                            <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="mb-1 font-medium text-[#0f766e]">Financial Health</h3>
                            <p className="text-sm leading-relaxed text-[#0f766e]/80">
                                {suggestedAmount
                                    ? `Dana darurat disarankan: ${formatCurrency(suggestedAmount)}.`
                                    : 'Kumpulkan dana darurat untuk keamanan finansial.'}
                            </p>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="w-full bg-[#0d9488] hover:bg-[#0f766e]">
                        Buat Dompet Dana Darurat
                    </Button>
                </div>
            ) : null}
        </Surface>
    );
}
