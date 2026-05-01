const { aggregateDashboardSummary } = require('../../shared/contracts/dashboardSummary');

describe('dashboard summary aggregation', () => {
    const now = new Date(2026, 4, 1, 12, 0, 0);
    const rows = [
        {
            id: '1',
            item: 'Warteg',
            harga: 15000,
            kategori: 'makan',
            tipe: 'pengeluaran',
            tanggal: new Date(2026, 4, 1, 8, 0, 0).toISOString(),
            catatan_asli: 'makan warteg 15rb'
        },
        {
            id: '2',
            item: 'Gaji',
            harga: 100000,
            kategori: 'gaji',
            tipe: 'pemasukan',
            tanggal: new Date(2026, 4, 1, 9, 0, 0).toISOString(),
            catatan_asli: 'gaji 100rb'
        },
        {
            id: '3',
            item: 'Bensin',
            harga: 30000,
            kategori: 'transport',
            tipe: 'pengeluaran',
            tanggal: new Date(2026, 3, 30, 10, 0, 0).toISOString(),
            catatan_asli: 'bensin 30rb'
        },
        {
            id: '4',
            item: 'Kopi',
            harga: 20000,
            kategori: 'makan',
            tipe: 'pengeluaran',
            tanggal: new Date(2026, 3, 24, 10, 0, 0).toISOString(),
            catatan_asli: 'kopi 20rb'
        }
    ];

    test('menghitung saldo harian dan mingguan', () => {
        const summary = aggregateDashboardSummary(rows, { now });

        expect(summary.balance).toMatchObject({
            todayIncome: 100000,
            todayExpense: 15000,
            todayRemaining: 85000,
            weekIncome: 100000,
            weekExpense: 45000
        });
    });

    test('mengelompokkan pengeluaran harian dan mingguan', () => {
        const summary = aggregateDashboardSummary(rows, { now });
        const today = summary.dailySeries[summary.dailySeries.length - 1];
        const currentWeek = summary.weeklySeries[summary.weeklySeries.length - 1];

        expect(today).toMatchObject({
            pengeluaran: 15000,
            pemasukan: 100000
        });
        expect(currentWeek).toMatchObject({
            pengeluaran: 45000,
            pemasukan: 100000
        });
    });

    test('mengurutkan kategori pengeluaran berdasarkan total', () => {
        const summary = aggregateDashboardSummary(rows, { now });

        expect(summary.categories).toEqual([
            { kategori: 'makan', total: 35000, count: 2 },
            { kategori: 'transport', total: 30000, count: 1 }
        ]);
    });
});
