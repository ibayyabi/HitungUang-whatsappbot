function toNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
}

function isEmergencyWallet(wallet) {
    const type = String(wallet.jenis_dompet || '').toLowerCase();
    const name = String(wallet.nama_dompet || '').toLowerCase();
    return type === 'dana_darurat' || name.includes('dana darurat');
}

function getEmergencyMultiplier(statusPekerjaan) {
    const status = String(statusPekerjaan || '').toLowerCase();
    return status === 'wirausaha' || status === 'freelance' ? 6 : 3;
}

function getWalletProgress(wallet) {
    const target = toNumber(wallet.target_nominal);
    const collected = toNumber(wallet.terkumpul);

    if (target <= 0) {
        return 0;
    }

    return Math.min(100, Math.round((collected / target) * 100));
}

function getPriorityRank(wallet) {
    if (wallet.priority_rank === null || wallet.priority_rank === undefined || wallet.priority_rank === '') {
        return null;
    }

    const rank = Number(wallet.priority_rank);
    return Number.isFinite(rank) ? rank : null;
}

function buildWalletSummary(wallet, profile = {}) {
    const target = toNumber(wallet.target_nominal);
    const collected = toNumber(wallet.terkumpul);
    const remainingAmount = Math.max(0, target - collected);
    const progress = getWalletProgress(wallet);
    const profileIncome = toNumber(profile.target_pemasukan_bulanan);
    const monthlyTarget = toNumber(wallet.monthly_target);
    const recommendedMonthlyAmount = monthlyTarget > 0
        ? monthlyTarget
        : Math.round(profileIncome * 0.1);
    const manualRank = getPriorityRank(wallet);
    let priorityReason = 'Masih ada gap target';

    if (manualRank !== null) {
        priorityReason = 'Prioritas manual';
    } else if (isEmergencyWallet(wallet) && progress < 100) {
        priorityReason = 'Dana darurat belum penuh';
    } else if (progress < 50) {
        priorityReason = 'Progress masih rendah';
    }

    return {
        ...wallet,
        jenis_dompet: wallet.jenis_dompet || (isEmergencyWallet(wallet) ? 'dana_darurat' : 'custom'),
        progress,
        remainingAmount,
        recommendedMonthlyAmount,
        priorityReason
    };
}

function compareWalletPriority(a, b) {
    const rankA = getPriorityRank(a);
    const rankB = getPriorityRank(b);
    const normalizedRankA = rankA === null ? 9999 : rankA;
    const normalizedRankB = rankB === null ? 9999 : rankB;

    if (normalizedRankA !== normalizedRankB) {
        return normalizedRankA - normalizedRankB;
    }

    const emergencyA = isEmergencyWallet(a) && getWalletProgress(a) < 100 ? 0 : 1;
    const emergencyB = isEmergencyWallet(b) && getWalletProgress(b) < 100 ? 0 : 1;

    if (emergencyA !== emergencyB) {
        return emergencyA - emergencyB;
    }

    const progressDiff = getWalletProgress(a) - getWalletProgress(b);

    if (progressDiff !== 0) {
        return progressDiff;
    }

    const remainingDiff = Math.max(0, toNumber(b.target_nominal) - toNumber(b.terkumpul)) -
        Math.max(0, toNumber(a.target_nominal) - toNumber(a.terkumpul));

    if (remainingDiff !== 0) {
        return remainingDiff;
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
}

function buildWalletSummaries(wallets, profile = {}) {
    return (Array.isArray(wallets) ? wallets : [])
        .map((wallet) => buildWalletSummary(wallet, profile))
        .sort(compareWalletPriority);
}

function suggestEmergencyTarget(profile = {}) {
    const spendingTarget = toNumber(profile.target_pengeluaran_bulanan);

    if (spendingTarget <= 0) {
        return 0;
    }

    return spendingTarget * getEmergencyMultiplier(profile.status_pekerjaan);
}

module.exports = {
    buildWalletSummary,
    buildWalletSummaries,
    compareWalletPriority,
    getEmergencyMultiplier,
    suggestEmergencyTarget
};
