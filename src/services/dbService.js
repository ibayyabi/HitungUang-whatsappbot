const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase URL atau Service Key tidak ditemukan di .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Mendapatkan profil user berdasarkan nomor WhatsApp
 * @param {string} whatsappNumber 
 */
async function getUserByWhatsapp(whatsappNumber) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
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
 * @param {Object} data - Objek transaksi (item, harga, kategori, lokasi, rawText, whatsappNumber)
 */
async function appendTransaction(data) {
    try {
        const user = await getUserByWhatsapp(data.whatsappNumber);

        if (!user) {
            return { success: false, registered: false };
        }

        const { error } = await supabase
            .from('transactions')
            .insert([{
                user_id: user.id,
                item: data.item,
                harga: data.harga,
                kategori: data.kategori || 'lainnya',
                lokasi: data.lokasi || null,
                catatan_asli: data.rawText,
                tipe: data.tipe || 'pengeluaran'
            }]);

        if (error) throw error;

        return { success: true, registered: true };
    } catch (error) {
        logger.error(`Gagal mencatat ke Supabase: ${error.message}`);
        throw error;
    }
}

module.exports = {
    getUserByWhatsapp,
    appendTransaction,
    supabase
};
