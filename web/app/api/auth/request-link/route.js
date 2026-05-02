function createErrorResponse(message, status) {
    return Response.json({
        success: false,
        message
    }, { status });
}

export async function POST(request) {
    try {
        const authModule = await import('../../../../../src/services/authLinkService');
        const authLinkService = authModule.default || authModule;
        const body = await request.json();
        const result = await authLinkService.requestAuthLink({
            telegramUserId: body && body.telegram_user_id,
            displayName: body && body.display_name,
            purpose: body && body.purpose,
            redirectTo: body && body.redirect_to
        });
        const responsePayload = {
            success: true,
            message: `Link masuk sudah dibuat untuk akun ${result.maskedTelegramId}. Jika meminta dari halaman web, gunakan tombol tautan langsung yang muncul di bawah. Untuk dikirim ke chat Telegram, ketik "dashboard" di bot.`,
            delivery: 'web_preview'
        };

        if (process.env.NODE_ENV !== 'production') {
            responsePayload.preview_link = result.actionLink;
        }

        return Response.json(responsePayload, { status: 200 });
    } catch (error) {
        console.error('Error request-link:', error);
        const message = error instanceof Error ? error.message : 'Gagal membuat magic link.';

        if (
            message === 'Akun belum terdaftar.' ||
            message === 'Isi Telegram User ID atau nama terdaftar.' ||
            message === 'Nama terdaftar dipakai lebih dari satu akun. Gunakan Telegram User ID.' ||
            message === 'Purpose auth tidak valid.'
        ) {
            return createErrorResponse(message, 400);
        }

        return createErrorResponse('Gagal membuat magic link.', 500);
    }
}
