export function Skeleton({ className = '', variant = 'default' }) {
    const variants = {
        default: 'h-4 w-full',
        text: 'h-4 w-3/4',
        title: 'h-6 w-1/2',
        circle: 'h-12 w-12 rounded-full',
        card: 'h-32 w-full',
        button: 'h-11 w-32',
    };

    return (
        <div
            className={`animate-pulse rounded-lg bg-[#efefef] ${variants[variant]} ${className}`}
            role="status"
            aria-label="Memuat konten"
        />
    );
}
