const dbService = require('./dbService');
const logger = require('../utils/logger');
const { getJakartaMonthKey } = require('../utils/jakartaDate');

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

async function maybeSendSpendingAlert({
    message,
    user,
    now = new Date(),
    db = dbService
}) {
    const target = Number(user && user.target_pengeluaran_bulanan || 0);

    if (!target || target <= 0) {
        logger.info(`Spending alert skipped_no_target user=${user && user.id}`);
        return { status: 'skipped_no_target' };
    }

    const currentMonth = getJakartaMonthKey(now);

    if (user.last_alert_month === currentMonth) {
        logger.info(`Spending alert skipped_already_sent user=${user.id} month=${currentMonth}`);
        return { status: 'skipped_already_sent', month: currentMonth };
    }

    let currentExpenses = 0;

    try {
        currentExpenses = await db.getTotalExpensesThisMonth(user.id, now);
    } catch (error) {
        logger.error(`Spending alert failed_total_query user=${user.id}: ${error.message}`);
        return { status: 'failed_total_query', error };
    }

    const percentage = currentExpenses / target;

    if (percentage < 0.8) {
        logger.info(`Spending alert skipped_below_threshold user=${user.id} total=${currentExpenses} target=${target} percentage=${percentage}`);
        return {
            status: 'skipped_below_threshold',
            currentExpenses,
            target,
            percentage
        };
    }

    await message.reply(
        `⚠️ *Warning!* Pengeluaran Anda bulan ini (${formatCurrency(currentExpenses)}) sudah mencapai ${Math.round(percentage * 100)}% dari target bulanan ${formatCurrency(target)}. Yuk rem sedikit belanjanya.`
    );

    const updated = await db.updateLastAlertMonth(user.id, currentMonth);

    if (!updated) {
        logger.error(`Spending alert failed_update_last_alert user=${user.id} month=${currentMonth}`);
        return {
            status: 'failed_update_last_alert',
            currentExpenses,
            target,
            percentage,
            month: currentMonth
        };
    }

    logger.info(`Spending alert sent user=${user.id} total=${currentExpenses} target=${target} percentage=${percentage} month=${currentMonth}`);
    return {
        status: 'sent',
        currentExpenses,
        target,
        percentage,
        month: currentMonth
    };
}

module.exports = {
    maybeSendSpendingAlert
};
