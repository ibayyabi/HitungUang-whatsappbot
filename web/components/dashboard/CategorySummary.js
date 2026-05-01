function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function CategorySummary({ categories, loading }) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500">Kategori NLP</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-950">Rekap otomatis</h2>
                </div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {categories.length} kategori
                </span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
                {loading ? (
                    <div className="h-32 animate-pulse rounded-md bg-slate-100" />
                ) : categories.length === 0 ? (
                    <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">Belum ada pengeluaran yang bisa direkap.</p>
                ) : categories.slice(0, 8).map((category) => (
                    <div key={category.kategori} className="rounded-md border border-slate-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold capitalize text-slate-800">{category.kategori}</span>
                            <strong className="text-sm text-slate-950">{formatCurrency(category.total)}</strong>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{category.count} transaksi</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
