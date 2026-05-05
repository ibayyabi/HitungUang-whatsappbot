jest.mock('../services/dbService', () => ({
    getTotalExpensesThisMonth: jest.fn(),
    updateLastAlertMonth: jest.fn()
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const dbService = require('../services/dbService');
const { maybeSendSpendingAlert } = require('../services/spendingAlertService');

function createMessage() {
    return {
        reply: jest.fn().mockResolvedValue()
    };
}

describe('spendingAlertService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        dbService.getTotalExpensesThisMonth.mockResolvedValue(0);
        dbService.updateLastAlertMonth.mockResolvedValue(true);
    });

    test('skip ketika target kosong', async () => {
        const result = await maybeSendSpendingAlert({
            message: createMessage(),
            user: { id: 'user-1' }
        });

        expect(result.status).toBe('skipped_no_target');
        expect(dbService.getTotalExpensesThisMonth).not.toHaveBeenCalled();
    });

    test('mengirim alert ketika total mencapai 80 persen', async () => {
        const message = createMessage();
        dbService.getTotalExpensesThisMonth.mockResolvedValue(800000);

        const result = await maybeSendSpendingAlert({
            message,
            user: {
                id: 'user-1',
                target_pengeluaran_bulanan: 1000000,
                last_alert_month: null
            },
            now: new Date('2026-05-05T04:00:00.000Z')
        });

        expect(result.status).toBe('sent');
        expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('80%'));
        expect(dbService.updateLastAlertMonth).toHaveBeenCalledWith('user-1', '2026-05');
    });

    test('tidak mengirim ulang alert dalam bulan yang sama', async () => {
        const message = createMessage();

        const result = await maybeSendSpendingAlert({
            message,
            user: {
                id: 'user-1',
                target_pengeluaran_bulanan: 1000000,
                last_alert_month: '2026-05'
            },
            now: new Date('2026-05-05T04:00:00.000Z')
        });

        expect(result.status).toBe('skipped_already_sent');
        expect(message.reply).not.toHaveBeenCalled();
    });

    test('tidak crash ketika query total gagal', async () => {
        dbService.getTotalExpensesThisMonth.mockRejectedValue(new Error('db down'));

        const result = await maybeSendSpendingAlert({
            message: createMessage(),
            user: {
                id: 'user-1',
                target_pengeluaran_bulanan: 1000000,
                last_alert_month: null
            }
        });

        expect(result.status).toBe('failed_total_query');
    });
});
