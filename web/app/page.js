import { BarChart3, LockKeyhole, MessageCircle, ReceiptText } from 'lucide-react';
import LandingSignupForm from './LandingSignupForm';
import { buildWhatsappChatUrl } from '../lib/whatsapp';

const journeys = [
    {
        title: 'Daftar dari web',
        text: 'Masukkan nomor, akun dibuat, lalu lanjut ke chat WhatsApp.'
    },
    {
        title: 'Mulai dari bot',
        text: 'Kirim pesan ke nomor bot. Kalau belum terdaftar, bot memberi link pendaftaran.'
    },
    {
        title: 'Masuk dashboard',
        text: 'Ketik dashboard di WhatsApp untuk menerima magic link pribadi.'
    }
];

const features = [
    { icon: ReceiptText, label: 'Catat teks, struk, dan voice note' },
    { icon: BarChart3, label: 'Ringkasan harian dan mingguan' },
    { icon: LockKeyhole, label: 'Login tanpa password via WhatsApp' }
];

export default function HomePage() {
    const chatbotUrl = buildWhatsappChatUrl('Halo CuanBeres, saya mau mulai mencatat uang.');

    return (
        <main className="site-shell">
            <section className="landing-hero">
                <div className="hero-copy">
                    <p className="eyebrow">CuanBeres</p>
                    <h1>Catat uang dari WhatsApp, pantau lewat dashboard.</h1>
                    <p className="lead">
                        Tulis transaksi seperti chat biasa. CuanBeres mengubahnya menjadi catatan rapi,
                        ringkasan, kategori, dan grafik yang bisa dibuka kapan saja.
                    </p>
                    <div className="hero-actions">
                        {chatbotUrl ? (
                            <a className="route-link secondary" href={chatbotUrl}>
                                <MessageCircle size={18} aria-hidden="true" />
                                Chat Bot
                            </a>
                        ) : null}
                        <a className="route-link secondary" href="/login">Masuk Dashboard</a>
                    </div>
                </div>

                <aside className="onboarding-panel" aria-label="Daftar CuanBeres">
                    <h2>Mulai gratis</h2>
                    <p>Daftarkan nomor WhatsApp yang akan dipakai mencatat transaksi.</p>
                    <LandingSignupForm />
                </aside>
            </section>

            <section className="journey-band">
                {journeys.map((item, index) => (
                    <article className="journey-step" key={item.title}>
                        <span>{index + 1}</span>
                        <h2>{item.title}</h2>
                        <p>{item.text}</p>
                    </article>
                ))}
            </section>

            <section className="feature-row">
                {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <article className="feature-tile" key={feature.label}>
                            <Icon size={22} aria-hidden="true" />
                            <p>{feature.label}</p>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
