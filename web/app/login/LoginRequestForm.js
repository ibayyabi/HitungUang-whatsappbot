'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, MessageSquare, Phone, User } from 'lucide-react';
import {
    botNumber,
    Button,
    ButtonLink,
    Field
} from '../../components/ui/Primitives';

const INITIAL_STATE = {
    telegramUserId: '',
    displayName: '',
    message: '',
    previewLink: '',
    isError: false,
    isLoading: false,
    success: false
};

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
}

function sanitizeMessage(message) {
    return String(message || '')
        .replace(/Telegram User ID/g, 'nomor WhatsApp')
        .replace(/Telegram/g, 'WhatsApp')
        .replace(/magic link/gi, 'link masuk aman');
}

export default function LoginRequestForm() {
    const searchParams = useSearchParams();
    const [state, setState] = useState(INITIAL_STATE);

    useEffect(() => {
        const whatsapp = searchParams.get('whatsapp') || searchParams.get('telegram_user_id') || '';
        const displayName = searchParams.get('display_name') || searchParams.get('name') || '';

        if (!whatsapp && !displayName) {
            return;
        }

        setState((current) => ({
            ...current,
            telegramUserId: normalizePhone(whatsapp),
            displayName
        }));
    }, [searchParams]);

    async function handleSubmit(event) {
        event.preventDefault();
        const normalizedWhatsapp = normalizePhone(state.telegramUserId);

        setState((current) => ({
            ...current,
            telegramUserId: normalizedWhatsapp,
            isLoading: true,
            message: '',
            previewLink: '',
            isError: false,
            success: false
        }));

        try {
            const response = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_user_id: normalizedWhatsapp,
                    display_name: state.displayName.trim(),
                    purpose: 'login_web',
                    redirect_to: '/dashboard'
                })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(sanitizeMessage(payload.message || 'Gagal meminta link masuk.'));
            }

            setState((current) => ({
                ...current,
                isLoading: false,
                isError: false,
                success: true,
                message: payload.preview_link
                    ? 'Link masuk aman berhasil dibuat. Buka link untuk masuk ke dashboard.'
                    : 'Link masuk aman berhasil dibuat. Cek WhatsApp atau buka chat bot.',
                previewLink: payload.preview_link || ''
            }));
        } catch (error) {
            setState((current) => ({
                ...current,
                isLoading: false,
                isError: true,
                success: false,
                message: error instanceof Error ? sanitizeMessage(error.message) : 'Gagal meminta link masuk.',
                previewLink: ''
            }));
        }
    }

    if (state.success) {
        return (
            <div className="animate-fade-in">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#d9d9d9] text-black">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="hu-subheading">Link masuk dibuat.</h2>
                <p className="hu-body mt-3 text-sm">{state.message}</p>

                <div className="mt-6 grid gap-3">
                    {state.previewLink ? (
                        <a href={state.previewLink} className="hu-button w-full">
                            Buka dashboard
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    ) : (
                        <ButtonLink href={`https://wa.me/${botNumber}`} className="w-full" external>
                            Buka chat bot
                            <ExternalLink className="h-4 w-4" />
                        </ButtonLink>
                    )}
                    <ButtonLink href={`https://wa.me/${botNumber}`} variant="secondary" className="w-full" external>
                        <MessageSquare className="h-4 w-4" />
                        Chat WhatsApp
                    </ButtonLink>
                </div>

                <div className="mt-6 grid gap-4 rounded-[24px] bg-[#f8f8f8] p-4 sm:grid-cols-[1fr_120px] sm:items-center">
                    <div>
                        <p className="text-sm font-medium text-black">Akses dari bot</p>
                        <p className="hu-body mt-2 text-sm">Anda juga bisa mengetik "dashboard" di WhatsApp untuk minta link baru.</p>
                    </div>
                    <div className="relative mx-auto aspect-[9/16] w-full max-w-[110px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-sm)]">
                        <Image src="/link.png" alt="QR kontak WhatsApp CuanBeres" fill className="object-cover" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <Field
                id="login-whatsapp"
                label="Nomor WhatsApp"
                icon={<Phone className="h-4 w-4 text-black" />}
                helper="Isi nomor atau nama terdaftar."
            >
                <input
                    id="login-whatsapp"
                    type="text"
                    placeholder="628123456789"
                    value={state.telegramUserId}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        telegramUserId: normalizePhone(event.target.value)
                    }))}
                    inputMode="numeric"
                    autoComplete="tel"
                    className="hu-input"
                />
            </Field>

            <Field
                id="login-name"
                label="Nama terdaftar"
                icon={<User className="h-4 w-4 text-black" />}
            >
                <input
                    id="login-name"
                    type="text"
                    placeholder="Nama saat daftar"
                    value={state.displayName}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        displayName: event.target.value
                    }))}
                    className="hu-input"
                />
            </Field>

            <Button
                type="submit"
                disabled={state.isLoading || (!state.telegramUserId.trim() && !state.displayName.trim())}
                className="w-full"
            >
                {state.isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memproses
                    </>
                ) : (
                    <>
                        Kirim link masuk
                        <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </Button>

            {state.message && (
                <div className={`rounded-[20px] p-4 text-sm ${state.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {state.message}
                </div>
            )}
        </form>
    );
}
