const {
    buildWalletSummaries,
    suggestEmergencyTarget
} = require('../../shared/contracts/wallets');

describe('wallet contracts', () => {
    test('mengurutkan dompet berdasarkan prioritas manual lalu progress', () => {
        const wallets = buildWalletSummaries([
            {
                id: 'wallet-1',
                nama_dompet: 'Liburan',
                target_nominal: 1000000,
                terkumpul: 900000,
                priority_rank: null,
                created_at: '2026-05-02T00:00:00.000Z'
            },
            {
                id: 'wallet-2',
                nama_dompet: 'Dana Darurat',
                jenis_dompet: 'dana_darurat',
                target_nominal: 3000000,
                terkumpul: 300000,
                priority_rank: null,
                created_at: '2026-05-01T00:00:00.000Z'
            },
            {
                id: 'wallet-3',
                nama_dompet: 'Pendidikan',
                target_nominal: 2000000,
                terkumpul: 0,
                priority_rank: 1,
                created_at: '2026-05-03T00:00:00.000Z'
            }
        ], { target_pemasukan_bulanan: 10000000 });

        expect(wallets.map((wallet) => wallet.id)).toEqual(['wallet-3', 'wallet-2', 'wallet-1']);
        expect(wallets[0].recommendedMonthlyAmount).toBe(1000000);
    });

    test('menghitung target dana darurat berdasarkan profil', () => {
        expect(suggestEmergencyTarget({
            status_pekerjaan: 'wirausaha',
            target_pengeluaran_bulanan: 5000000
        })).toBe(30000000);
    });
});
