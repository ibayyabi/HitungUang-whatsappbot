import { startOnboarding } from '../../../../lib/onboarding';

export async function POST(request) {
    try {
        const body = await request.json();
        const result = await startOnboarding(body);

        return Response.json(result.payload, { status: result.status });
    } catch (error) {
        console.error('Onboarding Error:', error);
        return Response.json({
            success: false,
            message: error instanceof Error ? error.message : 'Gagal memulai onboarding.'
        }, { status: 500 });
    }
}
