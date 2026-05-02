function createErrorResponse(message, status) {
    return Response.json({
        success: false,
        message
    }, { status });
}

export async function POST(request) {
    try {
        const whatsappModule = await import('../../../../lib/whatsapp');
        const authModule = await import('../../../../../src/services/authLinkService');
        const authLinkService = authModule.default || authModule;
        const body = await request.json();
        const result = await authLinkService.requestAuthLink({
            whatsappNumber: body && body.whatsapp_number,
            purpose: body && body.purpose,
            redirectTo: body && body.redirect_to
        });
        const dispatch = await whatsappModule.dispatchWhatsappMessage({
            whatsappNumber: result.whatsappNumber,
            message: `Ini link masuk Dashboard CuanBeres Anda:\n\n${result.actionLink}\n\nLink ini bersifat pribadi. Jangan dibagikan.`
        });
        const responsePayload = {
            success: true,
            message: dispatch.sent
                ? `Link masuk sudah dikirim ke ${result.maskedWhatsappNumber}.`
                : `Link masuk sudah dibuat untuk ${result.maskedWhatsappNumber}. Jika belum terkirim otomatis, ketik "dashboard" ke bot WhatsApp.`,
            delivery: dispatch.sent ? 'sent' : 'manual_whatsapp',
            whatsapp_url: whatsappModule.buildWhatsappChatUrl('dashboard')
        };

        if (process.env.NODE_ENV !== 'production') {
            responsePayload.preview_link = result.actionLink;
        }

        return Response.json(responsePayload, { status: 200 });
    } catch (error) {
        console.error('Error request-link:', error);
        const message = error instanceof Error ? error.message : 'Gagal membuat magic link.';

        if (message === 'Nomor WhatsApp belum terdaftar.' || message === 'Nomor WhatsApp tidak valid.' || message === 'Purpose auth tidak valid.') {
            return createErrorResponse(message, 400);
        }

        return createErrorResponse('Gagal membuat magic link.', 500);
    }
}
