export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

export async function apiClient(url, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    const maxRetries = options.retry ?? 2;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(url, {
                ...config,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new ApiError(
                    data.message || 'Terjadi kesalahan',
                    response.status,
                    data
                );
            }

            return await response.json();
        } catch (error) {
            lastError = error;

            // Don't retry on client errors (4xx)
            if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                throw error;
            }

            // Don't retry on abort
            if (error.name === 'AbortError') {
                throw new ApiError('Koneksi timeout. Silakan coba lagi.', 408, {});
            }

            // Retry on network errors or 5xx
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                continue;
            }
        }
    }

    // If all retries failed
    if (lastError instanceof ApiError) {
        throw lastError;
    }

    throw new ApiError(
        'Koneksi bermasalah. Silakan cek internet Anda dan coba lagi.',
        0,
        {}
    );
}
