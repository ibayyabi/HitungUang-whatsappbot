import { History, Calendar, Tag, MapPin, ReceiptText } from 'lucide-react';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function TransactionTable({ transactions, loading }) {
    return (
        <section className="p-card overflow-hidden">
            <header className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <History size={18} />
                    </div>
                    <div>
                        <h2 className="p-card-title mb-0">Riwayat Transaksi</h2>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Hasil strukturisasi AI</p>
                    </div>
                </div>
            </header>

            <div className="p-table-container">
                <table className="p-table">
                    <thead>
                        <tr>
                            <th><div className="flex items-center gap-2"><Calendar size={12} /> Waktu</div></th>
                            <th><div className="flex items-center gap-2"><ReceiptText size={12} /> Item & Chat Asli</div></th>
                            <th><div className="flex items-center gap-2"><Tag size={12} /> Kategori</div></th>
                            <th className="text-right">Nominal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <tr key={i}>
                                    <td colSpan={4} className="py-4"><div className="h-4 w-full animate-pulse bg-slate-50 rounded" /></td>
                                </tr>
                            ))
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-sm text-slate-400 font-medium italic">Belum ada transaksi tercatat.</td>
                            </tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="whitespace-nowrap font-medium text-slate-500 text-xs">
                                        {formatDate(tx.tanggal || tx.created_at)}
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-900">{tx.item}</span>
                                            <span className="text-[11px] text-slate-400 italic line-clamp-1">{tx.catatan_asli || '-'}</span>
                                            {tx.lokasi && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                    <MapPin size={10} /> {tx.lokasi}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`p-badge ${tx.tipe === 'pemasukan' ? 'p-badge-success' : 'p-badge-warning'} capitalize`}>
                                            {tx.kategori}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <span className={`font-extrabold ${tx.tipe === 'pemasukan' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {tx.tipe === 'pemasukan' ? '+' : ''}{formatCurrency(tx.harga)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
