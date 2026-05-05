'use client';

import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Surface } from './ui/Primitives';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Surface className="p-8 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-600" aria-hidden="true" />
                    <h2 className="mt-4 text-xl font-medium text-black">
                        Terjadi kesalahan
                    </h2>
                    <p className="mt-2 text-sm text-[#525252]">
                        Maaf, ada yang tidak beres. Silakan muat ulang halaman.
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="mt-6"
                        aria-label="Muat ulang halaman"
                    >
                        Muat ulang halaman
                    </Button>
                </Surface>
            );
        }

        return this.props.children;
    }
}
