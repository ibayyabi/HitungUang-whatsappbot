import { useState } from 'react';
import { Lightbulb, Plus, Wallet, Loader2 } from 'lucide-react';
import { Button, Surface } from '../ui/Primitives';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function WalletSection({ profile, wallets, loading, onWalletCreated }) {
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [walletName, setWalletName] = useState('Dana Darurat');
    const [targetAmount, setTargetAmount] = useState('');

    if (loading) {
        return (
            <Surface className="p-5 md:p-6 animate-pulse">
                <div className="h-6 w-32 bg-[#efefef] rounded mb-4" />
                <div className="h-24 bg-[#efefef] rounded-xl" />
            </Surface>
        );
    }

    const handleCreateWallet = async (e) => {
        e.preventDefault();
        if (!walletName || !targetAmount) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/dashboard/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nama_dompet: walletName,
                    target_nominal: parseInt(targetAmount, 10)
                })
            });

            if (res.ok) {
                setIsCreating(false);
                setWalletName('');
                setTargetAmount('');
                onWalletCreated();
            } else {
                alert('Gagal membuat dompet tabungan.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Rekomendasi Adaptif
    let suggestionText = '';
    let suggestedAmount = 0;
    
    if (profile) {
        const { status_pekerjaan, target_pengeluaran_bulanan } = profile;
        const multiplier = status_pekerjaan === 'karyawan' ? 3 : status_pekerjaan === 'wirausaha' ? 6 : 3;
        
        if (target_pengeluaran_bulanan) {
            suggestedAmount = target_pengeluaran_bulanan * multiplier;
            suggestionText = `Berdasarkan profil Anda sebagai ${status_pekerjaan || 'pengguna'}, kami menyarankan Anda memiliki Dana Darurat sebesar ${formatCurrency(suggestedAmount)} (${multiplier}x pengeluaran bulanan).`;
        } else {
            suggestionText = 'Kumpulkan dana darurat untuk keamanan finansial Anda di masa depan.';
        }
    }

    return (
        <Surface className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="hu-subheading flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#176d64]" />
                    Dompet Tabungan
                </h2>
                {!isCreating && wallets && wallets.length > 0 && (
                    <button onClick={() => setIsCreating(true)} className="text-[#176d64] hover:underline text-sm font-medium flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah
                    </button>
                )}
            </div>

            {isCreating ? (
                <form onSubmit={handleCreateWallet} className="bg-[#f9f9f9] p-4 rounded-[20px] space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nama Dompet</label>
                        <input 
                            type="text" 
                            className="hu-input bg-white w-full"
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="Contoh: Dana Darurat"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Target Nominal (Rp)</label>
                        <input 
                            type="number" 
                            className="hu-input bg-white w-full"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            placeholder={suggestedAmount ? suggestedAmount.toString() : "Contoh: 15000000"}
                            required
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setIsCreating(false)} className="flex-1">
                            Batal
                        </Button>
                    </div>
                </form>
            ) : wallets && wallets.length > 0 ? (
                <div className="space-y-4">
                    {wallets.map(wallet => {
                        const progress = wallet.target_nominal > 0 ? Math.min(100, Math.round((wallet.terkumpul / wallet.target_nominal) * 100)) : 0;
                        return (
                            <div key={wallet.id} className="bg-[#f9f9f9] p-4 rounded-[20px]">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-medium text-black">{wallet.nama_dompet}</h3>
                                    <span className="text-xs font-semibold bg-[#75ddd1]/25 text-[#176d64] px-2 py-1 rounded-full">
                                        {progress}%
                                    </span>
                                </div>
                                <div className="h-2 bg-[#efefef] rounded-full overflow-hidden mb-2">
                                    <div 
                                        className="h-full bg-[#176d64] transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-[#636363]">
                                    <span>Terkumpul: <b className="text-black">{formatCurrency(wallet.terkumpul)}</b></span>
                                    <span>Target: {formatCurrency(wallet.target_nominal)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-[#f0fdfa] border border-[#ccfbf1] p-4 rounded-[24px]">
                    <div className="flex gap-3 mb-3">
                        <div className="bg-white p-2 rounded-full h-fit text-[#0d9488]">
                            <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-medium text-[#0f766e] mb-1">Financial Health</h3>
                            <p className="text-sm text-[#0f766e]/80 leading-relaxed">
                                {suggestionText}
                            </p>
                        </div>
                    </div>
                    <Button onClick={() => {
                        if(suggestedAmount) setTargetAmount(suggestedAmount.toString());
                        setIsCreating(true);
                    }} className="w-full bg-[#0d9488] hover:bg-[#0f766e]">
                        Buat Dompet Dana Darurat
                    </Button>
                </div>
            )}
        </Surface>
    );
}
