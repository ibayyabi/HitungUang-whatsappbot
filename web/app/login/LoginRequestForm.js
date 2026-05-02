'use client';

import { useState } from 'react';

const INITIAL_STATE = {
    whatsappNumber: '',
    message: '',
    previewLink: '',
    whatsappUrl: '',
    isError: false,
    isLoading: false
};

export default function LoginRequestForm() {
    const [state, setState] = useState(INITIAL_STATE);

    async function handleSubmit(event) {
        event.preventDefault();
        setState((current) => ({
            ...current,
            isLoading: true,
            message: '',
            previewLink: '',
            whatsappUrl: '',
            isError: false
        }));

        try {
            const response = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    whatsapp_number: state.whatsappNumber,
                    purpose: 'login_web',
                    redirect_to: '/dashboard'
                })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Gagal meminta link masuk.');
            }

            setState((current) => ({
                ...current,
                isLoading: false,
                isError: false,
                message: payload.message || 'Link berhasil dibuat. Silakan cek WhatsApp Anda.',
                previewLink: payload.preview_link || '',
                whatsappUrl: payload.whatsapp_url || ''
            }));
        } catch (error) {
            setState((current) => ({
                ...current,
                isLoading: false,
                isError: true,
                message: error instanceof Error ? error.message : 'Gagal meminta link masuk.',
                previewLink: '',
                whatsappUrl: ''
            }));
        }
    }

    return (
        <form className="stack-form" onSubmit={handleSubmit}>
            <div className="field">
                <span>Nomor WhatsApp (dengan kode negara)</span>
                <input
                    type="text"
                    placeholder="Contoh: 628123456789"
                    value={state.whatsappNumber}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        whatsappNumber: event.target.value
                    }))}
                    autoComplete="tel"
                    required
                />
            </div>
            
            <button type="submit" disabled={state.isLoading}>
                {state.isLoading ? 'Memproses...' : 'Kirim Magic Link'}
            </button>

            {state.message ? (
                <div className={`status-message ${state.isError ? 'status-error' : 'status-success'}`}>
                    {state.message}
                </div>
            ) : null}

            {state.previewLink ? (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Mode Developer:
                    </p>
                    <a 
                        href={state.previewLink} 
                        className="route-link secondary" 
                        style={{ padding: '0.5rem 1.5rem', fontSize: '0.95rem' }}
                    >
                        Buka Tautan Langsung
                    </a>
                </div>
            ) : null}

            {state.whatsappUrl && !state.previewLink ? (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <a
                        href={state.whatsappUrl}
                        className="route-link secondary"
                        style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                    >
                        Chat Bot untuk Link
                    </a>
                </div>
            ) : null}
        </form>
    );
}
