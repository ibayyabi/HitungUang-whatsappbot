function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(value) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));
}

export function TransactionTable({ transactions, loading }) {
    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-500">History Transaksi</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">Raw chat dan hasil struktur</h2>
            </div>

            {loading ? (
                <div className="m-5 h-48 animate-pulse rounded-md bg-slate-100" />
            ) : transactions.length === 0 ? (
                <p className="m-5 rounded-md bg-slate-50 p-4 text-sm text-slate-500">Belum ada transaksi. Kirim catatan dari WhatsApp untuk mulai mengisi dashboard.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Waktu</th>
                                <th className="px-4 py-3">Raw chat</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Kategori</th>
                                <th className="px-4 py-3">Tipe</th>
                                <th className="px-4 py-3 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.slice(0, 50).map((transaction) => (
                                <tr key={transaction.id} className="align-top">
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(transaction.tanggal)}</td>
                                    <td className="max-w-xs px-4 py-3 text-slate-700">{transaction.catatan_asli || '-'}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">{transaction.item}</td>
                                    <td className="px-4 py-3 capitalize text-slate-600">{transaction.kategori}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${transaction.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            {transaction.tipe}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-950">{formatCurrency(transaction.harga)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
