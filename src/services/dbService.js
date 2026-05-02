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
 * Mendapatkan profil user berdasarkan nomor WhatsApp
 * @param {string} whatsappNumber 
 */
async function getUserByWhatsapp(whatsappNumber) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_FIELDS.join(','))
            .eq('whatsapp_number', whatsappNumber)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            throw error;
        }

        return data;
    } catch (error) {
        logger.error(`Gagal mendapatkan user by WA: ${error.message}`);
        throw error;
    }
}

/**
 * Mencatat transaksi baru ke database Supabase
 * @param {Object} data - Objek transaksi (item, harga, kategori, lokasi, rawText, whatsappNumber, userId)
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
            const user = await getUserByWhatsapp(firstTransaction.whatsappNumber);

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
            tipe: transaction.tipe || DEFAULT_TRANSACTION_TYPE
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

async function deleteLatestTransaction(userId) {
    try {
        if (!userId) {
            return {
                success: false,
                deleted: false,
                transaction: null
            };
        }

        const { data: latestRows, error: selectError } = await supabase
            .from('transactions')
            .select('id,item,harga,kategori,lokasi,catatan_asli,tipe,created_at,tanggal')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (selectError) {
            throw selectError;
        }

        const latest = latestRows && latestRows[0];

        if (!latest) {
            return {
                success: true,
                deleted: false,
                transaction: null
            };
        }

        const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', latest.id)
            .eq('user_id', userId);

        if (deleteError) {
            throw deleteError;
        }

        return {
            success: true,
            deleted: true,
            transaction: latest
        };
    } catch (error) {
        logger.error(`Gagal menghapus transaksi terakhir: ${error.message}`);
        throw error;
    }
}

module.exports = {
    getUserByWhatsapp,
    appendTransaction,
    appendTransactions,
    deleteLatestTransaction,
    splitNewTransactions,
    createTransactionSignature,
    supabase
};
