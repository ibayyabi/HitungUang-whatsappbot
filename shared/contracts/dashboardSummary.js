const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
    const day = date.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = startOfDay(date);
    start.setDate(start.getDate() - mondayOffset);
    return start;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDayLabel(date) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short'
    }).format(date);
}

function formatWeekLabel(date) {
    return `W${new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short'
    }).format(date)}`;
}

function emptyTotals() {
    return {
        pengeluaran: 0,
        pemasukan: 0,
        tabungan: 0
    };
}

function toAmount(row) {
    const amount = Number(row && row.harga);
    return Number.isFinite(amount) ? amount : 0;
}

function normalizeType(row) {
    if (row && row.tipe === 'pemasukan') {
        return 'pemasukan';
    }

    if (row && row.tipe === 'tabungan') {
        return 'tabungan';
    }

    return 'pengeluaran';
}

function aggregateDashboardSummary(rows, options = {}) {
    const transactions = Array.isArray(rows) ? rows : [];
    const now = options.now ? new Date(options.now) : new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const weekStart = startOfWeek(now);
    const nextWeekStart = addDays(weekStart, 7);
    const monthStart = startOfMonth(now);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dailyStart = addDays(todayStart, -6);
    const weeklyStart = addDays(weekStart, -21);

    const dailyMap = new Map();
    for (let index = 0; index < 7; index += 1) {
        const day = addDays(dailyStart, index);
        dailyMap.set(formatDayKey(day), {
            date: formatDayLabel(day),
            pengeluaran: 0,
            pemasukan: 0,
            tabungan: 0
        });
    }

    const weeklyMap = new Map();
    for (let index = 0; index < 4; index += 1) {
        const week = addDays(weeklyStart, index * 7);
        weeklyMap.set(formatDayKey(week), {
            week: formatWeekLabel(week),
            pengeluaran: 0,
            pemasukan: 0,
            tabungan: 0
        });
    }

    const categoryMap = new Map();
    const balance = {
        todayIncome: 0,
        todayExpense: 0,
        todayRemaining: 0,
        weekIncome: 0,
        weekExpense: 0,
        todaySavings: 0,
        weekSavings: 0,
        monthIncome: 0,
        monthExpense: 0,
        monthSavings: 0,
        availableMoney: 0
    };

    for (const row of transactions) {
        const date = new Date(row.tanggal || row.created_at);
        if (Number.isNaN(date.getTime())) {
            continue;
        }

        const amount = toAmount(row);
        const type = normalizeType(row);
        const isIncome = type === 'pemasukan';
        const isSaving = type === 'tabungan';

        if (date >= todayStart && date < tomorrowStart) {
            if (isIncome) {
                balance.todayIncome += amount;
            } else if (isSaving) {
                balance.todaySavings += amount;
            } else {
                balance.todayExpense += amount;
            }
        }

        if (date >= weekStart && date < nextWeekStart) {
            if (isIncome) {
                balance.weekIncome += amount;
            } else if (isSaving) {
                balance.weekSavings += amount;
            } else {
                balance.weekExpense += amount;
            }
        }

        if (date >= monthStart && date < nextMonthStart) {
            if (isIncome) {
                balance.monthIncome += amount;
            } else if (isSaving) {
                balance.monthSavings += amount;
            } else {
                balance.monthExpense += amount;
            }
        }

        const dayBucket = dailyMap.get(formatDayKey(startOfDay(date)));
        if (dayBucket) {
            dayBucket[type] += amount;
        }

        const weekBucket = weeklyMap.get(formatDayKey(startOfWeek(date)));
        if (weekBucket) {
            weekBucket[type] += amount;
        }

        if (!isIncome && !isSaving) {
            const category = row.kategori || 'lainnya';
            const existing = categoryMap.get(category) || {
                kategori: category,
                total: 0,
                count: 0
            };
            existing.total += amount;
            existing.count += 1;
            categoryMap.set(category, existing);
        }
    }

    balance.todayRemaining = balance.todayIncome - balance.todayExpense;
    balance.availableMoney = balance.monthIncome - balance.monthExpense - balance.monthSavings;

    return {
        balance,
        dailySeries: Array.from(dailyMap.values()),
        weeklySeries: Array.from(weeklyMap.values()),
        categories: Array.from(categoryMap.values()).sort((a, b) => b.total - a.total),
        transactions
    };
}

module.exports = {
    aggregateDashboardSummary,
    startOfDay,
    startOfMonth,
    startOfWeek,
    emptyTotals
};
