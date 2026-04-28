jest.mock('../services/dbService', () => ({
    getUserByWhatsapp: jest.fn(),
    supabase: {
        auth: {
            admin: {
                getUserById: jest.fn(),
                updateUserById: jest.fn(),
                generateLink: jest.fn()
            }
        }
    }
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const dbService = require('../services/dbService');
const authLinkService = require('../services/authLinkService');

describe('authLinkService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.WEB_APP_URL = 'http://localhost:3000';
        delete process.env.AUTH_PROXY_EMAIL_DOMAIN;
    });

    test('sanitizeRedirectPath hanya menerima path relatif internal', () => {
        expect(authLinkService.sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
        expect(authLinkService.sanitizeRedirectPath('https://evil.test')).toBe('/');
        expect(authLinkService.sanitizeRedirectPath('//evil.test')).toBe('/');
    });

    test('requestAuthLink membuat magic link untuk user terdaftar', async () => {
        dbService.getUserByWhatsapp.mockResolvedValue({
            id: 'user-1',
            whatsapp_number: '628123456789'
        });
        dbService.supabase.auth.admin.getUserById.mockResolvedValue({
            data: {
                user: {
                    id: 'user-1',
                    email: 'user@example.com',
                    user_metadata: {}
                }
            },
            error: null
        });
        dbService.supabase.auth.admin.generateLink.mockResolvedValue({
            data: {
                properties: {
                    action_link: 'https://supabase.test/auth?token=abc'
                }
            },
            error: null
        });

        const result = await authLinkService.requestAuthLink({
            whatsappNumber: '+62 812-3456-789',
            purpose: 'login_web',
            redirectTo: '/dashboard'
        });

        expect(dbService.getUserByWhatsapp).toHaveBeenCalledWith('628123456789');
        expect(dbService.supabase.auth.admin.generateLink).toHaveBeenCalledWith({
            type: 'magiclink',
            email: 'user@example.com',
            options: {
                redirectTo: 'http://localhost:3000/verify?purpose=login_web&next=%2Fdashboard'
            }
        });
        expect(result).toMatchObject({
            userId: 'user-1',
            whatsappNumber: '628123456789',
            purpose: 'login_web',
            redirectTo: '/dashboard',
            actionLink: 'https://supabase.test/auth?token=abc'
        });
    });

    test('requestAuthLink mengisi proxy email bila auth user belum punya email', async () => {
        dbService.getUserByWhatsapp.mockResolvedValue({
            id: 'user-2',
            whatsapp_number: '628111111111'
        });
        dbService.supabase.auth.admin.getUserById.mockResolvedValue({
            data: {
                user: {
                    id: 'user-2',
                    email: null,
                    user_metadata: {}
                }
            },
            error: null
        });
        dbService.supabase.auth.admin.updateUserById.mockResolvedValue({
            data: {
                user: {
                    email: 'wa-628111111111@auth.hitunguang.local'
                }
            },
            error: null
        });
        dbService.supabase.auth.admin.generateLink.mockResolvedValue({
            data: {
                properties: {
                    action_link: 'https://supabase.test/auth?token=def'
                }
            },
            error: null
        });

        await authLinkService.requestAuthLink({
            whatsappNumber: '628111111111',
            purpose: 'summary_link'
        });

        expect(dbService.supabase.auth.admin.updateUserById).toHaveBeenCalledWith('user-2', expect.objectContaining({
            email: 'wa-628111111111@auth.hitunguang.local',
            email_confirm: true
        }));
        expect(dbService.supabase.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({
            email: 'wa-628111111111@auth.hitunguang.local'
        }));
    });
});
