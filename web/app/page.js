'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import {
    ArrowRight,
    BarChart3,
    CheckCircle2,
    LockKeyhole,
    MessageCircle,
    ReceiptText,
    ShieldCheck
} from 'lucide-react';
import {
    AppHeader,
    botNumber,
    ButtonLink,
    IconBubble,
    PageShell,
    SectionIntro,
    Surface
} from '../components/ui/Primitives';

const navItems = [
    { href: '#fitur', label: 'Fitur' },
    { href: '#alur', label: 'Alur' },
    { href: '#aman', label: 'Keamanan' }
];

const features = [
    {
        title: 'Catat dari WhatsApp',
        description: 'Ketik transaksi seperti "kopi 18rb"; CuanBeres menyimpan nominal, kategori, dan waktu.',
        icon: MessageCircle
    },
    {
        title: 'Dashboard 90 hari',
        description: 'Pemasukan, pengeluaran, kategori, grafik, dan riwayat terbaca dari satu tempat.',
        icon: BarChart3
    },
    {
        title: 'Link masuk aman',
        description: 'Dashboard dibuka lewat link masuk sekali pakai, tanpa menampilkan istilah teknis ke user.',
        icon: LockKeyhole
    }
];

const steps = [
    {
        title: 'Daftar nomor WhatsApp',
        body: 'Isi nomor aktif atau lanjut dari link bot yang sudah membawa nomor.'
    },
    {
        title: 'Chat transaksi',
        body: 'Kirim teks natural, gambar struk, atau voice note dari WhatsApp.'
    },
    {
        title: 'Baca dashboard',
        body: 'Perbarui ringkasan untuk melihat transaksi, kategori, dan tren.'
    }
];

function ChatPreview() {
    return (
        <div className="hu-chat-preview">
            <div className="mb-6 flex items-center gap-3">
                <Image src="/logo.png" alt="CuanBeres" width={42} height={36} className="h-9 w-auto" />
                <div>
                    <p className="text-sm font-medium text-black">CuanBeres Bot</p>
                    <p className="text-xs text-[#636363]">WhatsApp</p>
                </div>
            </div>
            <div className="space-y-4">
                <div className="max-w-[84%] rounded-[22px] bg-white p-4 text-sm leading-6 text-[#636363] shadow-[var(--shadow-sm)]">
                    Kirim catatan uang harian dengan bahasa biasa.
                </div>
                <div className="ml-auto max-w-[78%] rounded-[22px] bg-[#d9d9d9] p-4 text-sm leading-6 text-black">
                    makan siang 25rb
                </div>
                <div className="max-w-[88%] rounded-[22px] bg-white p-4 text-sm leading-6 text-[#636363] shadow-[var(--shadow-sm)]">
                    Tersimpan sebagai pengeluaran makanan sebesar Rp 25.000.
                </div>
            </div>
        </div>
    );
}

function DashboardPreview() {
    const bars = [44, 72, 38, 92, 58, 66, 48];

    return (
        <div className="hu-dashboard-preview">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-[#636363]">Dashboard hari ini</p>
                    <p className="mt-2 text-5xl font-light leading-none text-black">Rp 84.000</p>
                </div>
                <span className="p-badge p-badge-success">90 hari</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    ['Pemasukan', 'Rp 150.000'],
                    ['Pengeluaran', 'Rp 66.000'],
                    ['Sisa', 'Rp 84.000']
                ].map(([label, value]) => (
                    <div key={label} className="rounded-[20px] bg-[#f8f8f8] p-4">
                        <p className="text-xs text-[#959595]">{label}</p>
                        <p className="mt-2 text-sm font-medium text-black">{value}</p>
                    </div>
                ))}
            </div>
            <div className="mt-8 grid h-44 grid-cols-7 items-end gap-2">
                {bars.map((height, index) => (
                    <div key={`${height}-${index}`} className="rounded-full bg-[#efefef]">
                        <div
                            className="rounded-full bg-[#75ddd1]"
                            style={{ height: `${height}%`, minHeight: '22px' }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProductPreview() {
    return (
        <div className="hu-product-preview">
            <div className="hu-glow absolute inset-x-4 top-10 h-72 rounded-[40px]" />
            <Surface className="relative overflow-hidden p-4 md:p-5">
                <div className="hu-preview-grid">
                    <ChatPreview />
                    <DashboardPreview />
                </div>
            </Surface>
        </div>
    );
}

export default function LandingPage() {
    useEffect(() => {
        document.documentElement.classList.add('landing-page');
        return () => document.documentElement.classList.remove('landing-page');
    }, []);

    return (
        <PageShell>
            <AppHeader navItems={navItems} />

            <section className="hu-shell hu-hero relative z-10">
                <div className="flex flex-col items-center reveal-sequence-smooth">
                    <div className="mb-6 inline-flex items-center rounded-full bg-black/[0.04] px-4 py-1.5 text-sm font-medium text-black ring-1 ring-black/[0.04] animate-bounce-in">
                        <MessageCircle className="mr-2 h-4 w-4 text-[#176d64]" aria-hidden="true" />
                        Asisten keuangan WhatsApp
                    </div>
                    <h1 className="hu-display mt-2 max-w-4xl text-gradient-animate">CuanBeres</h1>
                    <p className="hu-body mt-6 max-w-xl text-lg">
                        Catat transaksi lewat chat, biarkan CuanBeres merapikan kategori, lalu baca ringkasan uang harian dari dashboard web.
                    </p>
                    <div className="hu-actions mt-9 justify-center">
                        <ButtonLink href="/onboarding">
                            Mulai daftar
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </ButtonLink>
                        <ButtonLink href="/login" variant="secondary">
                            Masuk dashboard
                        </ButtonLink>
                    </div>
                    <div className="mt-10 flex flex-wrap justify-center gap-6">
                        {['Mulai dari web', 'Mulai dari chat bot', 'Link masuk aman'].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm font-medium text-black">
                                <CheckCircle2 className="h-4 w-4 text-[#176d64]" aria-hidden="true" />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-5xl">
                    <ProductPreview />
                </div>
            </section>

            <section id="fitur" className="hu-shell hu-section relative z-10">
                <div className="absolute inset-0 -z-10 h-[100%] w-full bg-[var(--gradient-hitunguang-glow)] opacity-[0.05] [mask-image:linear-gradient(to_bottom,transparent_0%,black_50%,transparent_100%)] pointer-events-none" />
                <SectionIntro
                    eyebrow="Fitur utama"
                    title="Pencatatan cepat, dashboard tetap rapi."
                    align="center"
                    className="hu-section-intro max-w-3xl"
                />
                <div className="hu-feature-grid">
                    {features.map(({ title, description, icon: Icon }) => (
                        <Surface key={title} as="article" className="hu-feature-card">
                            <IconBubble>
                                <Icon className="h-5 w-5" />
                            </IconBubble>
                            <h3 className="hu-subheading mt-7">{title}</h3>
                            <p className="hu-body mt-3 text-sm">{description}</p>
                        </Surface>
                    ))}
                </div>
            </section>

            <section id="alur" className="hu-shell hu-section relative z-10">
                <div className="absolute inset-0 -z-10 h-[100%] w-full bg-[var(--gradient-hitunguang-glow)] opacity-[0.05] [mask-image:linear-gradient(to_bottom,transparent_0%,black_50%,transparent_100%)] pointer-events-none" />
                <Surface className="hu-flow-surface">
                    <SectionIntro
                        eyebrow="Alur mulai"
                        title="Dari daftar ke chat dalam satu jalur."
                    >
                        Onboarding menjelaskan pilihan mulai dari web atau dari link bot, tanpa mengubah kontrak teknis backend.
                    </SectionIntro>

                    <div className="hu-step-list">
                        {steps.map((step, index) => (
                            <div key={step.title} className="hu-step-row">
                                <span className="hu-step-index">{index + 1}</span>
                                <div>
                                    <h3 className="text-xl font-normal leading-tight text-black">{step.title}</h3>
                                    <p className="hu-body mt-2 text-sm">{step.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Surface>
            </section>

            <section id="aman" className="hu-shell hu-section relative z-10">
                <div className="absolute inset-0 -z-10 h-[100%] w-full bg-[var(--gradient-hitunguang-glow)] opacity-[0.08] [mask-image:linear-gradient(to_bottom,transparent_0%,black_50%,transparent_100%)] pointer-events-none" />
                <div className="hu-centered-section">
                    <ShieldCheck className="mx-auto h-7 w-7 text-black" />
                    <h2 className="hu-heading mt-6">Data uang tetap milik akun Anda.</h2>
                    <p className="hu-body mt-5">
                        Dashboard hanya terbuka saat sesi valid. Link masuk aman dipakai untuk akses web, sementara pencatatan tetap berjalan lewat WhatsApp.
                    </p>
                    <div className="hu-actions mt-8 justify-center">
                        <ButtonLink href="/onboarding">
                            Lanjut onboarding
                            <ArrowRight className="h-4 w-4" />
                        </ButtonLink>
                        <ButtonLink href={`https://wa.me/${botNumber}`} variant="secondary" external>
                            <ReceiptText className="h-4 w-4" />
                            Buka chat bot
                        </ButtonLink>
                    </div>
                </div>
            </section>

            <footer className="hu-shell flex flex-col gap-4 py-9 text-sm text-[#636363] md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="" width={34} height={30} className="h-8 w-auto" />
                    <span>CuanBeres</span>
                </div>
                <span>2026 CuanBeres</span>
            </footer>
        </PageShell>
    );
}
