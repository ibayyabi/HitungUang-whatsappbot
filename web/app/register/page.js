'use client';

import { Suspense, useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function RegisterContent() {
    const searchParams = useSearchParams();
    const [whatsapp, setWhatsapp] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState({
        loading: false,
        message: '',
        isError: false,
        whatsappUrl: '',
        botWhatsappNumber: '',
        isExistingUser: false,
        delivery: ''
    });

    useEffect(() => {
        const wa = searchParams.get('whatsapp');
        if (wa) setWhatsapp(wa);
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, message: '', isError: false, whatsappUrl: '', botWhatsappNumber: '', isExistingUser: false, delivery: '' });

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ whatsapp_number: whatsapp, display_name: name })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Gagal registrasi');

            setStatus({
                loading: false,
                message: data.message,
                isError: false,
                whatsappUrl: data.whatsapp_url || '',
                botWhatsappNumber: data.bot_whatsapp_number || '',
                isExistingUser: data.existing_user,
                delivery: data.delivery
            });
        } catch (err) {
            setStatus({
                loading: false,
                message: err.message,
                isError: true,
                whatsappUrl: '',
                botWhatsappNumber: '',
                isExistingUser: false,
                delivery: ''
            });
        }
    };

    if (status.message && !status.isError && (status.whatsappUrl || status.botWhatsappNumber)) {
        return (
            <section className="hero-card animate-in" style={{ maxWidth: '500px' }}>
                <div className="success-icon-wrapper">
                    <div className="success-pulse" />
                    <MessageCircle size={48} className="success-icon" />
                </div>
                
                <h1 style={{ fontSize: '2.5rem', marginTop: '1rem' }}>
                    {status.isExistingUser ? 'Selesai! 🚀' : 'Berhasil! 🎉'}
                </h1>
                <p className="lead" style={{ marginBottom: '2rem' }}>
                    {status.isExistingUser 
                        ? `Akun ${name} sudah siap digunakan.` 
                        : `Akun ${name} berhasil dibuat.`}
                    {' '}
                    {status.delivery === 'sent' 
                        ? 'Bot kami sedang mengirimkan pesan sambutan ke nomor Anda.'
                        : 'Silakan chat bot kami untuk memulai.'}
                </p>

                <div className="success-action-area">
                    <a href={status.whatsappUrl} className="route-link pulse-button" style={{ width: '100%', gap: '12px', fontSize: '1.2rem' }}>
                        <MessageCircle size={24} />
                        Mulai Chat di WhatsApp
                    </a>
                    
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Atau simpan nomor bot kami:<br />
                        <strong>{status.botWhatsappNumber || 'Nomor Bot'}</strong>
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="hero-card" style={{ maxWidth: '500px' }}>
            <span className="eyebrow">Pendaftaran User</span>
            <h1>Halo User Baru!</h1>
            <p className="lead" style={{ marginBottom: '2rem' }}>
                Lengkapi nama Anda untuk mulai menggunakan HitungUang Bot.
            </p>

            <form className="stack-form" onSubmit={handleSubmit}>
                <div className="field">
                    <span>Nomor WhatsApp</span>
                    <input type="text" value={whatsapp} readOnly style={{ backgroundColor: 'var(--bg-secondary)', opacity: 0.7 }} />
                </div>
                <div className="field">
                    <span>Nama Tampilan</span>
                    <input 
                        type="text" 
                        placeholder="Masukkan nama Anda..." 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        autoFocus
                    />
                </div>
                <button type="submit" disabled={status.loading || !name}>
                    {status.loading ? 'Mendaftarkan...' : 'Selesaikan Pendaftaran'}
                </button>
            </form>

            {status.isError && status.message && (
                <div className="status-message status-error" style={{ marginTop: '1.5rem' }}>
                    {status.message}
                </div>
            )}
        </section>
    );
}

export default function RegisterPage() {
    return (
        <main className="page-shell">
            <div className="bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>
            <Suspense fallback={<p>Memuat...</p>}>
                <RegisterContent />
            </Suspense>
        </main>
    );
}
