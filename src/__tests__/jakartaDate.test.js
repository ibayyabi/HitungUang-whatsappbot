const { getJakartaMonthKey, getJakartaMonthRange } = require('../utils/jakartaDate');

describe('jakartaDate', () => {
    test('menghasilkan month key berdasarkan Asia/Jakarta', () => {
        expect(getJakartaMonthKey(new Date('2026-04-30T18:00:00.000Z'))).toBe('2026-05');
    });

    test('menghasilkan range bulan Jakarta dalam ISO UTC', () => {
        const range = getJakartaMonthRange(new Date('2026-05-05T12:00:00.000Z'));

        expect(range).toEqual({
            startIso: '2026-04-30T17:00:00.000Z',
            endIso: '2026-05-31T16:59:59.999Z'
        });
    });
});
