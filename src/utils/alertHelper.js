const dbService = require('../services/dbService');
const { getJakartaMonthKey } = require('./dateHelper');
const logger = require('./logger');

async function maybeSendSpendingAlert({ message, user, insertedExpenseTotal, now = new Date() }) {
    if (!insertedExpenseTotal || insertedExpenseTotal <= 0) {
        return 'skipped_not_expense';
    }

    const target = Number(user.target_pengeluaran_bulanan || 0);
    if (target <= 0) {
        logger.info(`Alert dilewati untuk user ${user.id}: target kosong atau nol.`);
        return 'skipped_no_target';
    }

    const currentMonth = getJakartaMonthKey(now);
    if (user.last_alert_month === currentMonth) {
        logger.info(`Alert dilewati untuk user ${user.id}: sudah pernah dikirim bulan ini (${currentMonth}).`);
        return 'skipped_already_sent';
    }

    try {
        const currentExpenses = await dbService.getTotalExpensesThisMonth(user.id, now);
        const percentage = currentExpenses / target;

        logger.info(`User ${user.id} - Target: ${target}, Total Bulan Ini: ${currentExpenses}, Persentase: ${(percentage * 100).toFixed(0)}%`);

        if (percentage >= 0.8) {
            await message.reply(`⚠️ *Warning!* Pengeluaran Anda bulan ini (Rp ${currentExpenses.toLocaleString('id-ID')}) sudah mencapai ${(percentage * 100).toFixed(0)}% dari target bulanan Anda. Yuk rem sedikit belanjanya!`);
            await dbService.updateLastAlertMonth(user.id, currentMonth);
            return 'sent';
        }

        return 'skipped_below_threshold';
    } catch (error) {
        logger.error(`Gagal menjalankan maybeSendSpendingAlert untuk user ${user.id}: ${error.message}`);
        return 'failed';
    }
}

module.exports = {
    maybeSendSpendingAlert
};
