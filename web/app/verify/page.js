'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { ButtonLink, PageShell, Surface } from '../../components/ui/Primitives';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState({
        phase: 'loading',
        message: 'Memverifikasi link masuk aman.'
    });

    useEffect(() => {
        document.documentElement.classList.add('landing-page');
        return () => document.documentElement.classList.remove('landing-page');
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function verifySession() {
            const supabase = createClient();
            const nextPath = searchParams.get('next') || '/dashboard';
            const safeNextPath = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';
            const code = searchParams.get('code');
            const tokenHash = searchParams.get('token_hash');
            const tokenType = searchParams.get('type') || 'magiclink';
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            try {
                if (tokenHash) {
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: tokenType
                    });
                    if (error) throw error;
                } else if (code) {
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
                        throw new Error('Sesi tidak ditemukan dari link ini.');
                    }
                }

                router.replace(safeNextPath);
            } catch (error) {
                if (!isMounted) return;
                setStatus({
                    phase: 'error',
                    message: error instanceof Error ? error.message : 'Link masuk tidak valid atau sudah kedaluwarsa.'
                });
            }
        }

        verifySession();

        return () => {
            isMounted = false;
        };
    }, [router, searchParams]);

    const isError = status.phase === 'error';

    return (
        <section className="hu-shell flex min-h-screen items-center justify-center py-10">
            <Surface className="w-full max-w-xl p-6 text-center md:p-8">
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#d9d9d9] text-black">
                    {isError ? <AlertCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </div>
                <p className="hu-kicker">{isError ? 'Verifikasi gagal' : 'Verifikasi'}</p>
                <h1 className="hu-heading mt-4">{isError ? 'Link tidak bisa dipakai.' : 'Sedang memeriksa link.'}</h1>
                <p className="hu-body mx-auto mt-4 max-w-md">{status.message}</p>

                {isError ? (
                    <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <ButtonLink href="/login">
                            Minta link baru
                            <ArrowRight className="h-4 w-4" />
                        </ButtonLink>
                        <ButtonLink href="/" variant="secondary">
                            Beranda
                        </ButtonLink>
                    </div>
                ) : (
                    <div className="mt-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-black" />
                    </div>
                )}
            </Surface>
        </section>
    );
}

export default function VerifyPage() {
    return (
        <PageShell>
            <Suspense
                fallback={
                    <section className="flex min-h-screen items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-black" />
                    </section>
                }
            >
                <VerifyContent />
            </Suspense>
        </PageShell>
    );
}
