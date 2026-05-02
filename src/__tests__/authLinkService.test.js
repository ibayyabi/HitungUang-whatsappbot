jest.mock('../services/dbService', () => ({
    getUserByTelegramId: jest.fn(),
    findUsersByDisplayName: jest.fn(),
    supabase: {
        auth: {
            admin: {
                getUserById: jest.fn(),
                updateUserById: jest.fn(),
                generateLink: jest.fn(),
                listUsers: jest.fn()
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
        dbService.findUsersByDisplayName.mockResolvedValue([]);
    });

    test('sanitizeRedirectPath hanya menerima path relatif internal', () => {
        expect(authLinkService.sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
        expect(authLinkService.sanitizeRedirectPath('https://evil.test')).toBe('/');
        expect(authLinkService.sanitizeRedirectPath('//evil.test')).toBe('/');
    });

    test('requestAuthLink membuat magic link untuk user terdaftar', async () => {
        dbService.getUserByTelegramId.mockResolvedValue({
            id: 'user-1',
            telegram_user_id: '123456789',
            telegram_username: 'ikhbar',
            display_name: 'Ikhbar'
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
            telegramUserId: '123456789',
            purpose: 'login_web',
            redirectTo: '/dashboard'
        });

        expect(dbService.getUserByTelegramId).toHaveBeenCalledWith('123456789');
        expect(dbService.supabase.auth.admin.generateLink).toHaveBeenCalledWith({
            type: 'magiclink',
            email: 'user@example.com',
            options: {
                redirectTo: 'http://localhost:3000/verify?purpose=login_web&next=%2Fdashboard'
            }
        });
        expect(result).toMatchObject({
            userId: 'user-1',
            telegramUserId: '123456789',
            purpose: 'login_web',
            redirectTo: '/dashboard',
            actionLink: 'https://supabase.test/auth?token=abc'
        });
    });

    test('requestAuthLink mengisi proxy email bila auth user belum punya email', async () => {
        dbService.getUserByTelegramId.mockResolvedValue({
            id: 'user-2',
            telegram_user_id: '111111111',
            telegram_username: 'userdua',
            display_name: 'User Dua'
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
                    email: 'tg-111111111@auth.cuanberes.local'
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
            telegramUserId: '111111111',
            purpose: 'summary_link'
        });

        expect(dbService.supabase.auth.admin.updateUserById).toHaveBeenCalledWith('user-2', expect.objectContaining({
            email: 'tg-111111111@auth.cuanberes.local',
            email_confirm: true
        }));
        expect(dbService.supabase.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({
            email: 'tg-111111111@auth.cuanberes.local'
        }));
    });

    test('requestAuthLink membuat magic link berdasarkan nama terdaftar', async () => {
        dbService.findUsersByDisplayName.mockResolvedValue([{
            id: 'user-3',
            telegram_user_id: '222222222',
            telegram_username: 'usertiga',
            display_name: 'User Tiga'
        }]);
        dbService.supabase.auth.admin.getUserById.mockResolvedValue({
            data: {
                user: {
                    id: 'user-3',
                    email: 'user3@example.com',
                    user_metadata: {}
                }
            },
            error: null
        });
        dbService.supabase.auth.admin.generateLink.mockResolvedValue({
            data: {
                properties: {
                    action_link: 'https://supabase.test/auth?token=ghi'
                }
            },
            error: null
        });

        const result = await authLinkService.requestAuthLink({
            displayName: 'User Tiga',
            purpose: 'login_web'
        });

        expect(dbService.findUsersByDisplayName).toHaveBeenCalledWith('User Tiga');
        expect(result).toMatchObject({
            telegramUserId: '222222222',
            actionLink: 'https://supabase.test/auth?token=ghi'
        });
    });

    test('requestAuthLink menolak input kosong', async () => {
        await expect(authLinkService.requestAuthLink({
            telegramUserId: 'abc',
            purpose: 'login_web'
        })).rejects.toThrow('Isi Telegram User ID atau nama terdaftar.');
    });

    test('requestAuthLink menolak Telegram user yang belum terdaftar', async () => {
        dbService.getUserByTelegramId.mockResolvedValue(null);

        await expect(authLinkService.requestAuthLink({
            telegramUserId: '98765',
            purpose: 'login_web'
        })).rejects.toThrow('Akun belum terdaftar.');
    });

    test('requestAuthLink menolak nama terdaftar yang duplikat', async () => {
        dbService.findUsersByDisplayName.mockResolvedValue([
            { id: 'user-1', telegram_user_id: '111', display_name: 'Ikhbar' },
            { id: 'user-2', telegram_user_id: '222', display_name: 'Ikhbar' }
        ]);

        await expect(authLinkService.requestAuthLink({
            displayName: 'Ikhbar',
            purpose: 'login_web'
        })).rejects.toThrow('Nama terdaftar dipakai lebih dari satu akun. Gunakan Telegram User ID.');
    });
});
