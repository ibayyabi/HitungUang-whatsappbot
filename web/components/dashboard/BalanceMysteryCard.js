import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';

function formatCurrency(value) {
    const number = Number(value || 0);
    const prefix = number < 0 ? '-' : '';
    return `${prefix}Rp ${Math.abs(number).toLocaleString('id-ID')}`;
}

function getStatusConfig(value) {
    if (value > 0) {
        return {
            label: 'Sisa positif',
            badgeClass: 'p-badge-success',
            icon: <TrendingUp className="h-4 w-4" />
        };
    }

    if (value === 0) {
        return {
            label: 'Seimbang',
            badgeClass: 'p-badge-warning',
            icon: <TrendingUp className="h-4 w-4" />
        };
    }

    return {
        label: 'Minus hari ini',
        badgeClass: 'p-badge-danger',
        icon: <TrendingDown className="h-4 w-4" />
    };
}

export function BalanceMysteryCard({ balance, loading }) {
    const remaining = Number(balance.todayRemaining || 0);
    const config = getStatusConfig(remaining);

    return (
        <section className="p-card relative min-h-[156px] overflow-hidden">
            <div className="hu-glow absolute inset-x-8 bottom-4 h-16 opacity-35" />
            <div className="relative">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefef] text-black">
                        <Wallet className="h-4 w-4" />
                    </div>
                    <span className={`p-badge ${config.badgeClass}`}>
                        {config.icon}
                        {config.label}
                    </span>
                </div>

                <div className="mt-6">
                    <p className="p-card-title">Sisa hari ini</p>
                    {loading ? (
                        <div className="mt-3 h-9 w-44 animate-pulse rounded-full bg-[#efefef]" />
                    ) : (
                        <h2 className="mt-3 text-4xl font-light leading-none text-black">
                            {formatCurrency(remaining)}
                        </h2>
                    )}
                </div>
            </div>
        </section>
    );
}
