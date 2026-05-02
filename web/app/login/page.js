import { Suspense } from 'react';
import LoginRequestForm from './LoginRequestForm';

export const metadata = {
    title: 'Masuk | HitungUang',
    description: 'Masuk ke dashboard HitungUang melalui magic link Telegram.'
};

export default function LoginPage() {
    return (
        <main className="page-shell">
            <div className="bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>

            <section className="hero-card" style={{ maxWidth: '600px' }}>
                <span className="eyebrow">Akses Aman</span>
                <h1 style={{ fontSize: '3rem' }}>Selamat Datang Kembali.</h1>
                <p className="lead" style={{ marginBottom: '2.5rem' }}>
                    Masuk memakai Telegram User ID atau nama yang sama seperti saat pendaftaran.
                    Jika datang dari bot, data akun akan diisi otomatis bila tersedia di tautan.
                </p>

                <Suspense fallback={<p>Memuat form masuk...</p>}>
                    <LoginRequestForm />
                </Suspense>

                <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Belum punya akun? Buka bot Telegram dan kirim /start.
                    </p>
                </div>
            </section>
        </main>
    );
}
