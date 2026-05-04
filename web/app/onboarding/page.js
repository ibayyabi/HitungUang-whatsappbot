'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clipboard,
    ExternalLink,
    MessageCircle,
    ScanLine,
    UserRound
} from 'lucide-react';
import {
    AppHeader,
    botNumber,
    Button,
    ButtonLink,
    IconBubble,
    PageShell,
    SectionIntro,
    Surface
} from '../../components/ui/Primitives';

const onboardingSteps = [
    {
        title: 'Isi identitas',
        description: 'Masukkan nomor WhatsApp aktif dan nama tampilan. Jika datang dari bot, nomor sudah terisi.',
        icon: UserRound
    },
    {
        title: 'Buka kontak bot',
        description: 'Pindai kode kontak atau pakai tombol chat untuk membuka WhatsApp.',
        icon: ScanLine
    },
    {
        title: 'Catat transaksi',
        description: 'Kirim pesan seperti "makan siang 25rb"; dashboard akan ikut terisi.',
        icon: MessageCircle
    }
];

const paths = [
    {
        title: 'Mulai dari web',
        description: 'Daftar nomor dan nama, lalu lanjut ke chat bot setelah sukses.'
    },
    {
        title: 'Mulai dari WhatsApp',
        description: 'Buka link dari bot; form register akan mengunci nomor yang sudah dikenali.'
    }
];

export default function OnboardingPage() {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        document.documentElement.classList.add('landing-page');
        return () => document.documentElement.classList.remove('landing-page');
    }, []);

    async function copyBotNumber() {
        try {
            await navigator.clipboard.writeText(botNumber);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    }

    return (
        <PageShell className="pb-24 md:pb-0">
            <AppHeader actionHref="/register" actionLabel="Daftar" secondaryHref="/login" secondaryLabel="Masuk" />

            <section className="hu-shell grid gap-12 py-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:py-20">
                <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                    <ButtonLink href="/" variant="ghost" className="mb-8 px-0">
                        <ArrowLeft className="h-4 w-4" />
                        Beranda
                    </ButtonLink>
                    <SectionIntro
                        eyebrow="Onboarding"
                        title="Siapkan WhatsApp sebelum masuk dashboard."
                    >
                        Alur ini menghubungkan nomor WhatsApp dengan akun CuanBeres, lalu mengarahkan Anda ke bot untuk mulai mencatat transaksi.
                    </SectionIntro>
                    <div className="mt-8 hidden gap-3 md:flex">
                        <ButtonLink href="/register">
                            Lanjut daftar
                            <ArrowRight className="h-4 w-4" />
                        </ButtonLink>
                        <ButtonLink href={`https://wa.me/${botNumber}`} variant="secondary" external>
                            Buka chat bot
                        </ButtonLink>
                    </div>
                </aside>

                <div className="grid gap-5">
                    <div className="grid gap-5 md:grid-cols-2">
                        {paths.map((path) => (
                            <Surface key={path.title} as="article" className="p-6">
                                <CheckCircle2 className="mb-5 h-5 w-5 text-[#176d64]" />
                                <h2 className="hu-subheading">{path.title}</h2>
                                <p className="hu-body mt-3 text-sm">{path.description}</p>
                            </Surface>
                        ))}
                    </div>

                    <Surface className="p-6">
                        <div className="grid gap-4">
                            {onboardingSteps.map(({ title, description, icon: Icon }, index) => (
                                <article key={title} className="grid gap-4 rounded-[24px] bg-[#f8f8f8] p-5 sm:grid-cols-[52px_1fr]">
                                    <IconBubble>
                                        <Icon className="h-5 w-5" />
                                    </IconBubble>
                                    <div>
                                        <p className="mb-2 text-sm text-[#959595]">Langkah {index + 1}</p>
                                        <h2 className="text-xl font-normal leading-tight text-black">{title}</h2>
                                        <p className="hu-body mt-2 text-sm">{description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </Surface>

                    <Surface as="article" className="overflow-hidden">
                        <div className="grid gap-7 p-6 md:grid-cols-[1fr_220px] md:items-center md:p-7">
                            <div>
                                <p className="hu-kicker">Kontak bot</p>
                                <h2 className="hu-subheading mt-3">Pakai kode kontak, bukan QR sesi WhatsApp.</h2>
                                <p className="hu-body mt-3 text-sm">
                                    Kode ini membuka kontak bot CuanBeres. Setelah registrasi, kirim contoh transaksi dari WhatsApp.
                                </p>
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <ButtonLink href={`https://wa.me/${botNumber}`} external>
                                        <ExternalLink className="h-4 w-4" />
                                        Buka chat
                                    </ButtonLink>
                                    <Button onClick={copyBotNumber} variant="secondary">
                                        <Clipboard className="h-4 w-4" />
                                        {copied ? 'Nomor tersalin' : 'Salin nomor'}
                                    </Button>
                                </div>
                            </div>
                            <div className="relative mx-auto aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-[24px] bg-[#efefef] shadow-[var(--shadow-sm)]">
                                <Image src="/link.jpg" alt="QR kontak WhatsApp CuanBeres" fill className="object-cover" />
                            </div>
                        </div>
                    </Surface>
                </div>
            </section>

            <div className="fixed inset-x-0 bottom-0 z-40 bg-white/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur md:hidden">
                <ButtonLink href="/register" className="w-full">
                    Lanjut daftar
                    <ArrowRight className="h-4 w-4" />
                </ButtonLink>
            </div>
        </PageShell>
    );
}
