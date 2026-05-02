'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const INITIAL_STATE = {
    telegramUserId: '',
    displayName: '',
    message: '',
    previewLink: '',
    isError: false,
    isLoading: false
};

export default function LoginRequestForm() {
    const searchParams = useSearchParams();
    const [state, setState] = useState(INITIAL_STATE);

    useEffect(() => {
        const telegramUserId = searchParams.get('telegram_user_id') || '';
        const displayName = searchParams.get('display_name') || searchParams.get('name') || '';

        if (!telegramUserId && !displayName) {
            return;
        }

        setState((current) => ({
            ...current,
            telegramUserId,
            displayName
        }));
    }, [searchParams]);

    async function handleSubmit(event) {
        event.preventDefault();
        setState((current) => ({
            ...current,
            isLoading: true,
            message: '',
            previewLink: '',
            isError: false
        }));

        try {
            const response = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_user_id: state.telegramUserId,
                    display_name: state.displayName,
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
                message: payload.message || 'Link masuk berhasil dibuat.',
                previewLink: payload.preview_link || ''
            }));
        } catch (error) {
            setState((current) => ({
                ...current,
                isLoading: false,
                isError: true,
                message: error instanceof Error ? error.message : 'Gagal meminta link masuk.',
                previewLink: ''
            }));
        }
    }

    return (
        <form className="stack-form" onSubmit={handleSubmit}>
            <div className="field">
                <span>Telegram User ID</span>
                <input
                    type="text"
                    placeholder="Contoh: 123456789"
                    value={state.telegramUserId}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        telegramUserId: event.target.value
                    }))}
                    inputMode="numeric"
                />
            </div>

            <div className="field">
                <span>Nama Terdaftar</span>
                <input
                    type="text"
                    placeholder="Nama yang dipakai saat daftar"
                    value={state.displayName}
                    onChange={(event) => setState((current) => ({
                        ...current,
                        displayName: event.target.value
                    }))}
                />
            </div>
            
            <button type="submit" disabled={state.isLoading || (!state.telegramUserId.trim() && !state.displayName.trim())}>
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
                        Tautan langsung:
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
        </form>
    );
}
