'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    CheckCircle2,
    Loader2,
    LockKeyhole,
    MessageCircle,
    Phone,
    Target,
    TrendingUp,
    UserRound
} from 'lucide-react';
import {
    AppHeader,
    botNumber,
    Button,
    ButtonLink,
    Field,
    PageShell,
    Surface
} from '../../components/ui/Primitives';
import { validatePhone, validateRequired, sanitizeText } from '../../lib/validation';
import { apiClient, ApiError } from '../../lib/api-client';

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
}

function RegisterContent() {
    const searchParams = useSearchParams();
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [name, setName] = useState('');
    const [statusPekerjaan, setStatusPekerjaan] = useState('karyawan');
    const [targetPengeluaran, setTargetPengeluaran] = useState('');
    const [targetPemasukan, setTargetPemasukan] = useState('');
    const [status, setStatus] = useState({
        loading: false,
        message: '',
        isError: false,
        success: false
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const userId = searchParams.get('whatsapp') || searchParams.get('telegram_user_id');
        const chatId = searchParams.get('chat_id');
        const username = searchParams.get('username');

        if (userId) setWhatsappNumber(normalizePhone(userId));
        if (chatId) setTelegramChatId(chatId);
        if (username) setTelegramUsername(username);
    }, [searchParams]);

    const lockedWhatsappNumber = !!searchParams.get('whatsapp') || !!searchParams.get('telegram_user_id');
    const registeredError = useMemo(
        () => status.isError && status.message.toLowerCase().includes('terdaftar'),
        [status.isError, status.message]
    );

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors({});
        
        const normalizedWhatsapp = normalizePhone(whatsappNumber);

        // Validate phone
        const phoneValidation = validatePhone(normalizedWhatsapp);
        if (!phoneValidation.valid) {
            setErrors({ whatsapp: phoneValidation.error });
            return;
        }

        // Validate name
        const nameValidation = validateRequired(name, 'Nama tampilan');
        if (!nameValidation.valid) {
            setErrors({ name: nameValidation.error });
            return;
        }

        setStatus({ loading: true, message: '', isError: false, success: false });
        setWhatsappNumber(normalizedWhatsapp);

        try {
            const data = await apiClient('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    telegram_user_id: normalizedWhatsapp,
                    telegram_chat_id: telegramChatId,
                    telegram_username: telegramUsername,
                    display_name: sanitizeText(name),
                    status_pekerjaan: statusPekerjaan,
                    target_pengeluaran_bulanan: targetPengeluaran ? parseInt(targetPengeluaran, 10) : null,
                    target_pemasukan_bulanan: targetPemasukan ? parseInt(targetPemasukan, 10) : null
                }),
                retry: 1
            });

            setStatus({
                loading: false,
                message: data.message || 'Registrasi berhasil.',
                isError: false,
                success: true
            });
        } catch (error) {
            const message = error instanceof ApiError
                ? error.message
                : 'Gagal registrasi. Silakan coba lagi.';
            setStatus({
                loading: false,
                message,
                isError: true,
                success: false
            });
        }
    };

    if (status.success) {
        return (
            <section className="hu-shell grid min-h-[calc(100vh-92px)] items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 reveal-sequence">
                    <ButtonLink href="/" variant="ghost" className="mb-8 px-0">
                        <ArrowLeft className="h-4 w-4" />
                        Beranda
                    </ButtonLink>
                    <div className="mb-7 flex items-center gap-3">
                        <Image src="/logo.png" alt="CuanBeres" width={54} height={47} className="h-12 w-auto" priority />
                        <span className="text-2xl font-medium text-black">CuanBeres</span>
                    </div>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-[#176d64] shadow-[var(--shadow-sm)]">
                        <CheckCircle2 className="h-4 w-4" />
                        Pendaftaran berhasil
                    </div>
                    <h1 className="hu-heading max-w-xl">Akun siap dipakai.</h1>
                    <p className="hu-body mt-5 max-w-lg">
                        Halo {name.trim()}, nomor WhatsApp sudah terhubung. Buka chat bot, kirim transaksi pertama, lalu minta link masuk dashboard saat perlu.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <ButtonLink href={`https://wa.me/${botNumber}`} external>
                            <MessageCircle className="h-4 w-4" />
                            Buka chat bot
                        </ButtonLink>
                        <ButtonLink href="/login" variant="secondary">
                            Masuk dashboard
                        </ButtonLink>
                    </div>
                </div>

                <Surface className="overflow-hidden animate-fade-in delay-200">
                    <div className="grid gap-6 p-5 md:grid-cols-[1fr_220px] md:items-center md:p-6">
                        <div>
                            <p className="hu-kicker">Langkah berikutnya</p>
                            <h2 className="hu-subheading mt-3">Kirim contoh transaksi dari WhatsApp.</h2>
                            <div className="mt-5 rounded-[24px] bg-[#f8f8f8] p-4">
                                <p className="text-sm text-[#636363]">Contoh pesan</p>
                                <p className="mt-2 text-2xl font-light text-black">makan siang 25rb</p>
                            </div>
                            <p className="hu-body mt-4 text-sm">
                                CuanBeres akan mengubah pesan menjadi transaksi terstruktur di dashboard.
                            </p>
                        </div>
                        <div className="relative mx-auto aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-[24px] bg-[#efefef] shadow-[var(--shadow-sm)]">
                            <Image src="/link.png" alt="QR kontak WhatsApp CuanBeres" fill className="object-cover" priority />
                        </div>
                    </div>
                </Surface>
            </section>
        );
    }

    return (
        <section className="hu-shell grid min-h-[calc(100vh-92px)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 reveal-sequence">
                <ButtonLink href="/onboarding" variant="ghost" className="mb-8 px-0">
                    <ArrowLeft className="h-4 w-4" />
                    Onboarding
                </ButtonLink>
                <div className="mb-7 flex items-center gap-3">
                    <Image src="/logo.png" alt="CuanBeres" width={54} height={47} className="h-12 w-auto" priority />
                    <span className="text-2xl font-medium text-black">CuanBeres</span>
                </div>
                <p className="hu-kicker">Registrasi</p>
                <h1 className="hu-heading mt-4 max-w-xl">Hubungkan nomor WhatsApp.</h1>
                <p className="hu-body mt-5 max-w-lg">
                    Isi nomor dengan format 628... dan nama tampilan. Nomor dari link bot akan terkunci agar akun tetap sesuai chat WhatsApp.
                </p>
            </div>

            <Surface className="p-6 md:p-8 animate-fade-in delay-200">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <Field
                        id="whatsapp-number"
                        label="Nomor WhatsApp"
                        icon={<Phone className="h-4 w-4 text-black" />}
                        helper={lockedWhatsappNumber ? 'Nomor berasal dari link WhatsApp bot.' : 'Gunakan kode negara Indonesia, contoh 628...'}
                    >
                        <input
                            id="whatsapp-number"
                            type="text"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="628123456789"
                            value={whatsappNumber}
                            onChange={(event) => {
                                setWhatsappNumber(normalizePhone(event.target.value));
                                setErrors(prev => ({ ...prev, whatsapp: null }));
                            }}
                            readOnly={lockedWhatsappNumber}
                            className="hu-input"
                            aria-invalid={!!errors.whatsapp}
                            aria-describedby={errors.whatsapp ? 'whatsapp-error' : undefined}
                        />
                        {errors.whatsapp && (
                            <p id="whatsapp-error" className="mt-2 text-sm text-red-600" role="alert">
                                {errors.whatsapp}
                            </p>
                        )}
                    </Field>

                    <Field
                        id="display-name"
                        label="Nama tampilan"
                        icon={<UserRound className="h-4 w-4 text-black" />}
                    >
                        <input
                            id="display-name"
                            type="text"
                            placeholder="Nama panggilan"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setErrors(prev => ({ ...prev, name: null }));
                            }}
                            required
                            autoFocus
                            className="hu-input"
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                        />
                        {errors.name && (
                            <p id="name-error" className="mt-2 text-sm text-red-600" role="alert">
                                {errors.name}
                            </p>
                        )}
                    </Field>

                    <Field
                        id="status-pekerjaan"
                        label="Status Pekerjaan"
                        icon={<Briefcase className="h-4 w-4 text-black" />}
                    >
                        <select
                            id="status-pekerjaan"
                            value={statusPekerjaan}
                            onChange={(event) => setStatusPekerjaan(event.target.value)}
                            className="hu-input bg-white"
                        >
                            <option value="karyawan">Karyawan / Profesional</option>
                            <option value="wirausaha">Wirausaha / Bisnis</option>
                            <option value="freelance">Pekerja Lepas / Freelance</option>
                            <option value="mahasiswa">Mahasiswa / Pelajar</option>
                            <option value="lainnya">Lainnya</option>
                        </select>
                    </Field>

                    <Field
                        id="target-pengeluaran"
                        label="Target Pengeluaran Bulanan (Rp)"
                        icon={<Target className="h-4 w-4 text-black" />}
                        helper="Batas maksimal pengeluaran bulan ini agar kami bisa mengingatkan Anda."
                    >
                        <input
                            id="target-pengeluaran"
                            type="number"
                            min="0"
                            placeholder="Contoh: 5000000"
                            value={targetPengeluaran}
                            onChange={(event) => setTargetPengeluaran(event.target.value)}
                            className="hu-input"
                        />
                    </Field>

                    <Field
                        id="target-pemasukan"
                        label="Estimasi Pemasukan Bulanan (Rp)"
                        icon={<TrendingUp className="h-4 w-4 text-black" />}
                        helper="Pemasukan rutin untuk menghitung rekomendasi tabungan."
                    >
                        <input
                            id="target-pemasukan"
                            type="number"
                            min="0"
                            placeholder="Contoh: 10000000"
                            value={targetPemasukan}
                            onChange={(event) => setTargetPemasukan(event.target.value)}
                            className="hu-input"
                        />
                    </Field>

                    <Button
                        type="submit"
                        disabled={status.loading || !name.trim() || !whatsappNumber.trim()}
                        className="w-full"
                    >
                        {status.loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Memproses
                            </>
                        ) : (
                            <>
                                Selesaikan daftar
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>

                {status.message && (
                    <div className={`mt-5 rounded-[20px] p-4 text-sm ${status.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        <div className="flex items-start gap-3">
                            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p>{status.message}</p>
                                {registeredError ? (
                                    <Link href={`/login?whatsapp=${encodeURIComponent(normalizePhone(whatsappNumber))}`} className="mt-3 inline-flex font-medium underline decoration-black/40 underline-offset-4">
                                        Minta link masuk
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </Surface>
        </section>
    );
}

export default function RegisterPage() {
    useEffect(() => {
        document.documentElement.classList.add('landing-page');
        return () => document.documentElement.classList.remove('landing-page');
    }, []);

    return (
        <PageShell>
            <AppHeader actionHref="/register" actionLabel="Daftar" secondaryHref="/login" secondaryLabel="Masuk" />
            <Suspense
                fallback={
                    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-black" />
                        <p className="hu-meta">Memuat form registrasi...</p>
                    </div>
                }
            >
                <RegisterContent />
            </Suspense>
        </PageShell>
    );
}
