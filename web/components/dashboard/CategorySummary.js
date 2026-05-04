import { PieChart } from 'lucide-react';
import { ButtonLink } from '../ui/Primitives';

const categoryColors = ['#75ddd1', '#fae5ba', '#edb09c', '#d9d9d9', '#aeaeae'];

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function CategorySummary({ categories, loading }) {
    const maxTotal = Math.max(...categories.map((category) => Number(category.total || 0)), 1);

    return (
        <section className="p-card">
            <header className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efefef] text-black">
                        <PieChart className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="p-card-title mb-0">Kategori pengeluaran</h2>
                        <p className="hu-meta">{loading ? 'Memuat kategori' : `${categories.length} kategori`}</p>
                    </div>
                </div>
            </header>

            <div className="space-y-3">
                {loading ? (
                    [1, 2, 3].map((item) => (
                        <div key={item} className="h-16 w-full animate-pulse rounded-[20px] bg-[#efefef]" />
                    ))
                ) : categories.length === 0 ? (
                    <div className="rounded-[24px] bg-[#f8f8f8] p-5 text-center">
                        <p className="text-sm font-medium text-black">Belum ada kategori.</p>
                        <p className="hu-body mt-2 text-sm">Catat transaksi pengeluaran dari WhatsApp untuk mengisi daftar ini.</p>
                        <ButtonLink href="https://wa.me/628123456789" variant="secondary" className="mt-4" external>
                            Catat transaksi
                        </ButtonLink>
                    </div>
                ) : (
                    categories.map((category, index) => {
                        const color = categoryColors[index % categoryColors.length];
                        const width = Math.min(100, (Number(category.total || 0) / maxTotal) * 100);

                        return (
                            <div key={category.kategori} className="rounded-[22px] bg-[#f8f8f8] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="text-sm font-medium capitalize text-black">{category.kategori}</span>
                                        <p className="hu-meta mt-1">{category.count} transaksi</p>
                                    </div>
                                    <span className="text-sm font-medium text-black">{formatCurrency(category.total)}</span>
                                </div>
                                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${width}%`, backgroundColor: color }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}
