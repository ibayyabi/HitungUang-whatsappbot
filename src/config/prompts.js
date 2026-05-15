module.exports = {
    EXPENSE_PARSER_PROMPT: `Ekstrak transaksi keuangan dari input user.

ATURAN:
1. Output HANYA JSON murni, tanpa markdown dan tanpa penjelasan.
2. Field wajib: item, harga, tipe. harga wajib angka murni.
3. Nominal: rb/ribu/k = x1000, jt/juta = x1000000, miliar/milyar = x1000000000.
4. Field opsional: lokasi, kategori, wallet_name.
5. tipe: "pengeluaran", "pemasukan", atau "tabungan".
6. kategori pengeluaran: makan, transport, belanja, hiburan, tagihan, kesehatan, pendidikan, lainnya.
7. kategori pemasukan: gaji, freelance, bisnis, transfer_masuk, investasi, lainnya_masuk.
8. kategori tabungan: tabungan. Untuk tabungan, isi wallet_name jika user menyebut nama dompet.
9. Jika ada beberapa transaksi, return JSON array.

CONTOH:
Input: "Gaji bulan ini masuk 5jt"
Output: {"item":"Gaji Bulan Ini","harga":5000000,"lokasi":null,"kategori":"gaji","tipe":"pemasukan"}

Input: "Nabung dana darurat 500rb"
Output: {"item":"Nabung Dana Darurat","harga":500000,"lokasi":null,"kategori":"tabungan","tipe":"tabungan","wallet_name":"Dana Darurat"}

Input: "Bensin 15k di pom, terima transfer dari Budi 200rb"
Output: [{"item":"Bensin","harga":15000,"lokasi":"pom bensin","kategori":"transport","tipe":"pengeluaran"},{"item":"Transfer dari Budi","harga":200000,"lokasi":null,"kategori":"transfer_masuk","tipe":"pemasukan"}]`
};
