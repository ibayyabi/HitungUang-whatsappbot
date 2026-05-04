const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const {
    DEFAULT_TRANSACTION_CATEGORY,
    DEFAULT_TRANSACTION_TYPE,
    PROFILE_FIELDS
} = require('../../shared/contracts');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase URL atau Service Key tidak ditemukan di .env');
}

function createMissingSupabaseProxy() {
    return new Proxy({}, {
        get() {
            throw new Error('Konfigurasi Supabase admin belum lengkap.');
        }
    });
}

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createMissingSupabaseProxy();
const DUPLICATE_LOOKBACK_MINUTES = 10;

function normalizeComparableValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value).trim().toLowerCase();
}

function createTransactionSignature(transaction) {
    return JSON.stringify({
        item: normalizeComparableValue(transaction.item),
        harga: Number(transaction.harga || 0),
        kategori: normalizeComparableValue(transaction.kategori || 'lainnya'),
        lokasi: normalizeComparableValue(transaction.lokasi || null),
        tipe: normalizeComparableValue(transaction.tipe || 'pengeluaran'),
        rawText: normalizeComparableValue(transaction.catatan_asli || transaction.rawText || '')
    });
}

function splitNewTransactions(payload, existingRows) {
    const existingCounts = new Map();

    for (const row of existingRows) {
        const signature = createTransactionSignature(row);
        existingCounts.set(signature, (existingCounts.get(signature) || 0) + 1);
    }

    const newTransactions = [];
    let skippedCount = 0;

    for (const transaction of payload) {
        const signature = createTransactionSignature(transaction);
        const remainingExistingCount = existingCounts.get(signature) || 0;

        if (remainingExistingCount > 0) {
            existingCounts.set(signature, remainingExistingCount - 1);
            skippedCount += 1;
            continue;
        }

        newTransactions.push(transaction);
    }

    return {
        newTransactions,
        skippedCount
    };
}

async function findRecentSimilarTransactions(userId, rawText) {
    if (!rawText) {
        return [];
    }

    const lookbackDate = new Date(Date.now() - (DUPLICATE_LOOKBACK_MINUTES * 60 * 1000)).toISOString();
    const { data, error } = await supabase
        .from('transactions')
        .select('item,harga,kategori,lokasi,catatan_asli,tipe,created_at')
        .eq('user_id', userId)
        .eq('catatan_asli', rawText)
        .gte('created_at', lookbackDate);

    if (error) {
        throw error;
    }

    return data || [];
}

/**
 * Mendapatkan profil user berdasarkan Telegram user ID.
 * @param {string} telegramUserId
 */
async function getUserByTelegramId(telegramUserId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_FIELDS.join(','))
            .eq('telegram_user_id', telegramUserId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            throw error;
        }

        return data;
    } catch (error) {
        logger.error(`Gagal mendapatkan user by Telegram ID: ${error.message}`);
        throw error;
    }
}

async function findUsersByDisplayName(displayName) {
    const normalizedDisplayName = String(displayName || '').trim();

    if (!normalizedDisplayName) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_FIELDS.join(','))
            .ilike('display_name', normalizedDisplayName)
            .limit(2);

        if (error) {
            throw error;
        }

        return data || [];
    } catch (error) {
        logger.error(`Gagal mendapatkan user by display name: ${error.message}`);
        throw error;
    }
}

async function getTotalExpensesThisMonth(userId) {
    try {
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        const { data, error } = await supabase
            .from('transactions')
            .select('harga')
            .eq('user_id', userId)
            .eq('tipe', 'pengeluaran')
            .gte('tanggal', firstDay)
            .lte('tanggal', lastDay);

        if (error) throw error;

        return data.reduce((sum, tx) => sum + (tx.harga || 0), 0);
    } catch (error) {
        logger.error(`Gagal mengambil total pengeluaran bulan ini: ${error.message}`);
        return 0;
    }
}

async function updateLastAlertMonth(userId, monthString) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ last_alert_month: monthString })
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (error) {
        logger.error(`Gagal mengupdate last_alert_month: ${error.message}`);
        return false;
    }
}

async function findWalletByName(userId, walletName) {
    if (!walletName) return null;
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('id, nama_dompet, terkumpul, target_nominal')
            .eq('user_id', userId)
            .ilike('nama_dompet', `%${walletName.trim()}%`)
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (error) {
        logger.error(`Gagal mencari dompet: ${error.message}`);
        return null;
    }
}

async function updateWalletBalance(walletId, additionalAmount) {
    try {
        // Fetch current balance
        const { data: wallet, error: fetchError } = await supabase
            .from('wallets')
            .select('terkumpul')
            .eq('id', walletId)
            .single();

        if (fetchError) throw fetchError;

        const newBalance = (wallet.terkumpul || 0) + additionalAmount;

        const { error: updateError } = await supabase
            .from('wallets')
            .update({ terkumpul: newBalance })
            .eq('id', walletId);

        if (updateError) throw updateError;
        return true;
    } catch (error) {
        logger.error(`Gagal update saldo dompet: ${error.message}`);
        return false;
    }
}

/**
 * Mencatat transaksi baru ke database Supabase
 * @param {Object} data - Objek transaksi (item, harga, kategori, lokasi, rawText, telegramUserId, userId)
 */
async function appendTransaction(data) {
    const result = await appendTransactions([data]);
    return result;
}

/**
 * Mencatat banyak transaksi dalam satu operasi database
 * @param {Array<Object>} transactions - Daftar transaksi yang akan disimpan
 */
async function appendTransactions(transactions) {
    try {
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return { success: false, registered: true, insertedCount: 0 };
        }

        const firstTransaction = transactions[0];
        let userId = firstTransaction.userId;

        if (!userId) {
            const user = await getUserByTelegramId(firstTransaction.telegramUserId);

            if (!user) {
                return { success: false, registered: false, insertedCount: 0 };
            }

            userId = user.id;
        }

        if (!userId) {
            return { success: false, registered: false };
        }

        const payload = transactions.map((transaction) => ({
            user_id: userId,
            item: transaction.item,
            harga: transaction.harga,
            kategori: transaction.kategori || DEFAULT_TRANSACTION_CATEGORY,
            lokasi: transaction.lokasi || null,
            catatan_asli: transaction.rawText,
            tipe: transaction.tipe || DEFAULT_TRANSACTION_TYPE,
            wallet_id: transaction.wallet_id || null
        }));

        const recentSimilarTransactions = await findRecentSimilarTransactions(userId, payload[0].catatan_asli);
        const { newTransactions, skippedCount } = splitNewTransactions(payload, recentSimilarTransactions);

        if (newTransactions.length === 0) {
            logger.warn(`Duplikat transaksi terdeteksi untuk user ${userId}, insert dilewati.`);
            return {
                success: true,
                registered: true,
                duplicate: true,
                insertedCount: 0,
                skippedCount
            };
        }

        const { error } = await supabase
            .from('transactions')
            .insert(newTransactions);

        if (error) throw error;

        return {
            success: true,
            registered: true,
            duplicate: skippedCount > 0,
            insertedCount: newTransactions.length,
            skippedCount
        };
    } catch (error) {
        logger.error(`Gagal mencatat ke Supabase: ${error.message}`);
        throw error;
    }
}

module.exports = {
    getUserByTelegramId,
    findUsersByDisplayName,
    getTotalExpensesThisMonth,
    updateLastAlertMonth,
    findWalletByName,
    updateWalletBalance,
    appendTransaction,
    appendTransactions,
    splitNewTransactions,
    createTransactionSignature,
    supabase
};
