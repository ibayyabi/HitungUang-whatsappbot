export function normalizeWhatsappNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

export function getBotWhatsappNumber() {
    return normalizeWhatsappNumber(process.env.WHATSAPP_BOT_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER);
}

export function buildWhatsappChatUrl(message = '') {
    const botNumber = getBotWhatsappNumber();

    if (!botNumber) {
        return null;
    }

    const target = new URL(`https://wa.me/${botNumber}`);

    if (message) {
        target.searchParams.set('text', message);
    }

    return target.toString();
}

export async function dispatchWhatsappMessage({ whatsappNumber, message }) {
    const webhookUrl = process.env.WHATSAPP_DISPATCH_WEBHOOK_URL;
    const webhookSecret = process.env.WHATSAPP_DISPATCH_WEBHOOK_SECRET;

    if (!webhookUrl) {
        return {
            sent: false,
            reason: 'webhook_not_configured'
        };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {})
            },
            body: JSON.stringify({
                whatsapp_number: normalizeWhatsappNumber(whatsappNumber),
                message
            })
        });

        if (!response.ok) {
            return {
                sent: false,
                reason: 'webhook_failed'
            };
        }

        return {
            sent: true,
            reason: 'webhook_delivered'
        };
    } catch (error) {
        console.error('WhatsApp dispatch error:', error);
        return {
            sent: false,
            reason: 'webhook_error'
        };
    }
}
