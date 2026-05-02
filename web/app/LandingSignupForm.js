'use client';

import { useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';

const INITIAL_STATE = {
    displayName: '',
    whatsappNumber: '',
    loading: false,
    message: '',
    isError: false,
    whatsappUrl: '',
    botWhatsappNumber: ''
};

export default function LandingSignupForm() {
    const [state, setState] = useState(INITIAL_STATE);

    async function handleSubmit(event) {
        event.preventDefault();
        setState((current) => ({
            ...current,
            loading: true,
            message: '',
            isError: false,
            whatsappUrl: '',
            botWhatsappNumber: ''
        }));

        try {
            const response = await fetch('/api/onboarding/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    display_name: state.displayName,
                    whatsapp_number: state.whatsappNumber
                })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Gagal memulai akun.');
            }

            setState((current) => ({
                ...current,
                loading: false,
                message: payload.message,
                isError: false,
                whatsappUrl: payload.whatsapp_url || '',
                botWhatsappNumber: payload.bot_whatsapp_number || ''
            }));
        } catch (error) {
            setState((current) => ({
                ...current,
                loading: false,
                message: error instanceof Error ? error.message : 'Gagal memulai akun.',
                isError: true,
                whatsappUrl: '',
                botWhatsappNumber: ''
            }));
        }
    }

    return (
        <form className="landing-form" onSubmit={handleSubmit}>
            <div className="field">
                <span>Nama</span>
                <input
                    type="text"
                    placeholder="Nama tampilan"
                    value={state.displayName}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        displayName: event.target.value
                    }))}
                    required
                />
            </div>
            <div className="field">
                <span>Nomor WhatsApp</span>
                <input
                    type="tel"
                    placeholder="628123456789"
                    value={state.whatsappNumber}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        whatsappNumber: event.target.value
                    }))}
                    autoComplete="tel"
                    required
                />
            </div>
            <button type="submit" disabled={state.loading}>
                <span>{state.loading ? 'Memproses...' : 'Mulai dari WhatsApp'}</span>
                <ArrowRight size={18} aria-hidden="true" />
            </button>

            {state.message ? (
                <div className={`status-message ${state.isError ? 'status-error' : 'status-success'}`}>
                    {state.message}
                </div>
            ) : null}

            {!state.isError && (state.whatsappUrl || state.botWhatsappNumber) ? (
                <div className="whatsapp-next-step">
                    {state.botWhatsappNumber ? (
                        <span>Nomor bot: <strong>{state.botWhatsappNumber}</strong></span>
                    ) : null}
                    {state.whatsappUrl ? (
                        <a className="route-link compact-link" href={state.whatsappUrl}>
                            <MessageCircle size={18} aria-hidden="true" />
                            Chat Bot Sekarang
                        </a>
                    ) : null}
                </div>
            ) : null}
        </form>
    );
}
