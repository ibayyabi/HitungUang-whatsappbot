const featureList = [
    'Daftar dengan nomor WhatsApp',
    'Minta link masuk ke WhatsApp',
    'Lihat ringkasan transaksi dari Supabase'
];

const routeList = [
    { href: '/login', label: 'Route login magic link' },
    { href: '/verify', label: 'Route verify placeholder' }
];

export default function HomePage() {
    return (
        <main className="page-shell">
            <section className="hero-card">
                <p className="eyebrow">HitungUang Web</p>
                <h1>Scaffold awal untuk onboarding, login, dan dashboard.</h1>
                <p className="lead">
                    Folder ini sengaja dibuat ringan sebagai titik awal fase monorepo.
                    Struktur App Router sudah siap, dan request magic link server-side
                    sudah bisa diuji dari halaman login.
                </p>

                <div className="feature-grid">
                    {featureList.map((feature) => (
                        <article key={feature} className="feature-card">
                            <span className="feature-dot" />
                            <p>{feature}</p>
                        </article>
                    ))}
                </div>

                <div className="route-list">
                    {routeList.map((route) => (
                        <a key={route.href} className="route-link" href={route.href}>
                            {route.label}
                        </a>
                    ))}
                </div>
            </section>
        </main>
    );
}
