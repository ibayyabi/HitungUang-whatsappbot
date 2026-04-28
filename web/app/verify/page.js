export const metadata = {
    title: 'Memverifikasi... | HitungUang',
    description: 'Sedang memproses tautan masuk Anda.'
};

export default function VerifyPage() {
    return (
        <main className="page-shell">
            <div className="bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>

            <section className="hero-card" style={{ maxWidth: '600px' }}>
                <span className="eyebrow">Keamanan</span>
                <h1>Sedang Memverifikasi.</h1>
                <p className="lead">
                    Mohon tunggu sebentar selagi kami memproses tautan masuk aman Anda. 
                    Anda akan segera dialihkan ke dashboard.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid var(--accent-light)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </section>
        </main>
    );
}
