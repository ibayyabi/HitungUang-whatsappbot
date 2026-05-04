import { Calendar, History, MapPin, MessageCircle, ReceiptText, Tag } from 'lucide-react';
import { ButtonLink } from '../ui/Primitives';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function TransactionAmount({ transaction }) {
    const isIncome = transaction.tipe === 'pemasukan';

    return (
        <span className={`font-medium ${isIncome ? 'text-[#176d64]' : 'text-black'}`}>
            {isIncome ? '+' : ''}
            {formatCurrency(transaction.harga)}
        </span>
    );
}

function EmptyState() {
    return (
        <div className="rounded-[24px] bg-[#f8f8f8] p-6 text-center">
            <MessageCircle className="mx-auto mb-4 h-6 w-6 text-black" />
            <p className="text-sm font-medium text-black">Belum ada transaksi.</p>
            <p className="hu-body mx-auto mt-2 max-w-sm text-sm">Catat transaksi pertama lewat WhatsApp, lalu perbarui dashboard.</p>
            <ButtonLink href="https://wa.me/628123456789" variant="secondary" className="mt-4" external>
                Buka WhatsApp
            </ButtonLink>
        </div>
    );
}

function TransactionMobileList({ transactions }) {
    return (
        <div className="grid gap-3 md:hidden">
            {transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-[22px] bg-[#f8f8f8] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-base font-medium text-black">{transaction.item}</h3>
                            <p className="hu-meta mt-1">{formatDate(transaction.tanggal || transaction.created_at)}</p>
                        </div>
                        <TransactionAmount transaction={transaction} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#636363]">
                        <span className="rounded-full bg-white px-3 py-1 capitalize shadow-[var(--shadow-sm)]">{transaction.kategori}</span>
                        {transaction.lokasi ? (
                            <span className="rounded-full bg-white px-3 py-1 shadow-[var(--shadow-sm)]">{transaction.lokasi}</span>
                        ) : null}
                    </div>
                    <p className="mt-3 text-sm text-[#636363]">{transaction.catatan_asli || '-'}</p>
                </article>
            ))}
        </div>
    );
}

export function TransactionTable({ transactions, loading }) {
    return (
        <section className="p-card overflow-hidden">
            <header className="mb-6 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efefef] text-black">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="p-card-title mb-0">Transaksi terbaru</h2>
                        <p className="hu-meta">Hasil catatan dari WhatsApp</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="grid gap-3">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-16 w-full animate-pulse rounded-[22px] bg-[#efefef]" />
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <TransactionMobileList transactions={transactions} />
                    <div className="p-table-container hidden md:block">
                        <table className="p-table">
                            <thead>
                                <tr>
                                    <th>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3" />
                                            Waktu
                                        </div>
                                    </th>
                                    <th>
                                        <div className="flex items-center gap-2">
                                            <ReceiptText className="h-3 w-3" />
                                            Item dan chat
                                        </div>
                                    </th>
                                    <th>
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-3 w-3" />
                                            Kategori
                                        </div>
                                    </th>
                                    <th className="text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td className="whitespace-nowrap text-xs text-[#636363]">
                                            {formatDate(transaction.tanggal || transaction.created_at)}
                                        </td>
                                        <td>
                                            <div>
                                                <span className="font-medium text-black">{transaction.item}</span>
                                                <p className="mt-1 max-w-md truncate text-xs text-[#959595]">{transaction.catatan_asli || '-'}</p>
                                                {transaction.lokasi ? (
                                                    <div className="mt-1 flex items-center gap-1 text-xs text-[#959595]">
                                                        <MapPin className="h-3 w-3" />
                                                        {transaction.lokasi}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`p-badge ${transaction.tipe === 'pemasukan' ? 'p-badge-success' : 'p-badge-warning'} capitalize`}>
                                                {transaction.kategori}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <TransactionAmount transaction={transaction} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
