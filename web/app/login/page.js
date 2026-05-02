import LoginRequestForm from './LoginRequestForm';
import { buildWhatsappChatUrl } from '../../lib/whatsapp';

export const metadata = {
    title: 'Masuk | HitungUang',
    description: 'Masuk ke dashboard HitungUang melalui magic link WhatsApp.'
};

export default function LoginPage() {
    const chatbotUrl = buildWhatsappChatUrl('Halo CuanBeres, saya mau daftar.');

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
                    Kami akan mengirimkan tautan masuk rahasia ke nomor WhatsApp Anda. 
                    Tanpa password, tanpa ribet.
                </p>

                <LoginRequestForm />

                <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Belum punya akun?{' '}
                        <a href={chatbotUrl || '/'} style={{ color: 'var(--accent)', fontWeight: '700', textDecoration: 'none' }}>
                            Daftar via WhatsApp
                        </a>
                    </p>
                </div>
            </section>
        </main>
    );
}
