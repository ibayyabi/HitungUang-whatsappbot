import { PieChart } from 'lucide-react';

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function CategorySummary({ categories, loading }) {
    return (
        <section className="p-card">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                        <PieChart size={18} />
                    </div>
                    <h2 className="p-card-title mb-0">Distribusi Kategori</h2>
                </div>
                <span className="p-badge p-badge-success">
                    {categories.length} Kategori
                </span>
            </header>

            <div className="space-y-1">
                {loading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="h-16 w-full animate-pulse bg-slate-50 rounded-xl mb-3" />
                    ))
                ) : categories.length === 0 ? (
                    <p className="text-center py-8 text-sm text-slate-400 font-medium italic">Belum ada data kategori.</p>
                ) : (
                    categories.map((cat) => (
                        <div key={cat.kategori} className="group p-3 rounded-xl transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 capitalize tracking-tight">{cat.kategori}</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{cat.count} Transaksi</span>
                                </div>
                                <span className="text-sm font-extrabold text-slate-700">{formatCurrency(cat.total)}</span>
                            </div>
                            <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (cat.total / (categories[0]?.total || 1)) * 100)}%` }} 
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
