'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [message, setMessage] = useState('Mohon tunggu sebentar selagi kami memproses tautan masuk aman Anda.');

    useEffect(() => {
        let isMounted = true;

        async function verifySession() {
            const supabase = createClient();
            const nextPath = searchParams.get('next') || '/dashboard';
            const safeNextPath = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';
            const code = searchParams.get('code');
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            try {
                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                } else if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase.auth.getSession();
                    if (error) throw error;
                    if (!data.session) {
                        throw new Error('Session tidak ditemukan dari tautan ini.');
                    }
                }

                router.replace(safeNextPath);
            } catch (error) {
                if (!isMounted) return;
                setMessage(error instanceof Error ? error.message : 'Tautan masuk tidak valid atau sudah kedaluwarsa.');
            }
        }

        verifySession();

        return () => {
            isMounted = false;
        };
    }, [router, searchParams]);

    return (
        <section className="hero-card" style={{ maxWidth: '600px' }}>
            <span className="eyebrow">Keamanan</span>
            <h1>Sedang Memverifikasi.</h1>
            <p className="lead">{message}</p>

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
    );
}

export default function VerifyPage() {
    return (
        <main className="page-shell">
            <div className="bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>

            <Suspense fallback={<p>Memuat...</p>}>
                <VerifyContent />
            </Suspense>
        </main>
    );
}
