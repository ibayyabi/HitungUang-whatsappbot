const { google } = require('googleapis');
const path = require('path');
const { loadEnv } = require('../config/env');

loadEnv();

class SheetsService {
    constructor() {
        const credentialsPath = path.resolve(process.cwd(), process.env.GOOGLE_CREDENTIALS_PATH || 'credentials.json');

        // Inisialisasi Auth dengan Service Account
        this.auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        this.spreadsheetId = process.env.SPREADSHEET_ID;
        this.sheetName = process.env.SHEET_NAME || 'Sheet1';
    }

    /**
     * Menambah baris pengeluaran baru ke Google Sheets
     * @param {Object} data - { item: string, harga: number, lokasi: string, kategori: string, rawText: string }
     */
    async appendExpense(data) {
        try {
            const date = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

            const values = [
                [
                    date,
                    data.item,
                    data.lokasi || '-',
                    data.harga,
                    data.kategori || 'lainnya',
                    data.rawText
                ]
            ];

            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${this.sheetName}!A:F`,
                valueInputOption: 'USER_ENTERED', // Supaya angka otomatis diformat sebagai mata uang jika di-set di Sheet
                requestBody: {
                    values: values,
                },
            });

            return response.data;
        } catch (error) {
            console.error('Error appending to Sheets:', error);
            throw error;
        }
    }

    /**
     * Mengambil rangkuman harian (opsional untuk fitur ringkasan)
     */
    async getTodaySummary() {
        // Implementasi menyusul di fase development berikutnya
        // Kita fokus ke pencatatan dulu
    }
}

module.exports = new SheetsService();
