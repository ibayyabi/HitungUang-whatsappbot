'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function RegisterContent() {
    const searchParams = useSearchParams();
    const [whatsapp, setWhatsapp] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState({ loading: false, message: '', isError: false });

    useEffect(() => {
        const wa = searchParams.get('whatsapp');
        if (wa) setWhatsapp(wa);
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, message: '', isError: false });

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ whatsapp_number: whatsapp, display_name: name })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Gagal registrasi');

            setStatus({ loading: false, message: data.message, isError: false });
        } catch (err) {
            setStatus({ loading: false, message: err.message, isError: true });
        }
    };

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

            {status.message && (
                <div className={`status-message ${status.isError ? 'status-error' : 'status-success'}`} style={{ marginTop: '1.5rem' }}>
                    {status.message}
                </div>
            )}
            
            {!status.isError && status.message && (
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <a href="/login" className="route-link">Ke Halaman Login →</a>
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
