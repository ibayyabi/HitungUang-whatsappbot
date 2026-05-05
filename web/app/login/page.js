'use client';

import { Suspense, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
    AppHeader,
    ButtonLink,
    PageShell,
    SectionIntro,
    Surface
} from '../../components/ui/Primitives';
import LoginRequestForm from './LoginRequestForm';

export default function LoginPage() {
    useEffect(() => {
        document.documentElement.classList.add('landing-page');
        return () => document.documentElement.classList.remove('landing-page');
    }, []);

    return (
        <PageShell>
            <AppHeader actionHref="/register" actionLabel="Daftar" secondaryHref="/" secondaryLabel="Beranda" />
            <section className="hu-shell grid min-h-[calc(100vh-92px)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 reveal-sequence">
                    <ButtonLink href="/" variant="ghost" className="mb-8 px-0">
                        <ArrowLeft className="h-4 w-4" />
                        Beranda
                    </ButtonLink>
                    <div className="mb-7 flex items-center gap-3">
                        <Image src="/logo.png" alt="CuanBeres" width={54} height={47} className="h-12 w-auto" priority />
                        <span className="text-2xl font-medium text-black">CuanBeres</span>
                    </div>
                    <SectionIntro
                        eyebrow="Masuk dashboard"
                        title="Minta link masuk aman."
                    >
                        Pakai nomor WhatsApp atau nama terdaftar. Setelah link dibuat, buka halaman verifikasi untuk masuk ke dashboard.
                    </SectionIntro>
                </div>

                <Surface className="p-6 md:p-8 animate-fade-in delay-200">
                    <Suspense
                        fallback={
                            <div className="flex flex-col items-center gap-4 py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-black" />
                                <p className="hu-meta">Memuat form masuk...</p>
                            </div>
                        }
                    >
                        <LoginRequestForm />
                    </Suspense>

                    <div className="mt-7 border-t border-black/10 pt-6 text-center">
                        <p className="text-sm text-[#636363]">
                            Belum punya akun?{' '}
                            <a href="/register" className="font-medium text-black underline decoration-black/35 underline-offset-4">
                                Daftar
                            </a>
                        </p>
                    </div>
                </Surface>
            </section>
        </PageShell>
    );
}
