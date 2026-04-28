# HitungUang Plan

Dokumen ini dikurasi ulang supaya backlog lebih operasional, bisa dieksekusi bertahap, dan mencerminkan kondisi repo saat ini.

## Status Saat Ini

### Sudah Dieksekusi
- [x] Perbaikan klasifikasi pesan agar transaksi dengan frasa waktu seperti `bulan ini` tidak salah masuk ke flow NL query.
- [x] Perbaikan `nl2sqlService` agar jawaban summary disusun dari data Supabase yang nyata, bukan narasi AI yang berisiko halusinasi.
- [x] Batch insert transaksi untuk mengurangi query berulang ke `profiles` dan menekan risiko partial insert pada multi-item.
- [x] Penambahan test untuk classifier, handler, dan formatter NL2SQL.

### Baru Dieksekusi di Putaran Ini
- [x] Hardening runtime bot di `src/index.js` untuk menangani error async dan event client dengan logging yang lebih jelas.

## Backlog Prioritas

### Fase 1: Stabilitas Bot Service
1. [x] Koreksi routing NLP vs transaksi di `src/handlers/messageHandler.js`.
2. [x] Hapus perhitungan summary yang tidak faktual dari `src/services/nl2sqlService.js`.
3. [x] Tambahkan perlindungan runtime dasar agar error handler, `client.initialize()`, `unhandledRejection`, dan `uncaughtException` tidak lewat diam-diam.
4. [x] Tambahkan idempotency untuk multi-insert agar retry user tidak menciptakan duplikat transaksi yang identik.
5. [x] Tambahkan test untuk `dbService.appendTransactions()` dan skenario kegagalan Supabase.
6. [x] Audit `src/services/aiParser.js` untuk fallback yang lebih deterministik ketika JSON dari model rusak.

### Fase 2: Persiapan Monorepo Web
1. [x] Buat folder `web/` dengan scaffold minimal aplikasi Next.js atau placeholder package terpisah.
2. [x] Tentukan strategi shared env:
    gunakan root `.env` sebagai sumber utama, lalu dokumentasikan variabel yang dipakai bot dan web.
3. [x] Tambahkan kontrak data bersama untuk auth dan transaksi jika web mulai dibuat.
4. [x] Revisi `.env.example` agar mencerminkan Supabase-first flow, bukan Google Sheets legacy.

### Fase 3: Auth dan Magic Link
1. [x] Desain flow login dengan nomor WA dan token sekali pakai.
2. [x] Implementasi generator link via Supabase admin API di sisi backend yang aman.
3. [ ] Tambahkan action link pada respons bot untuk summary tertentu.
4. [ ] Buat halaman validasi token di web dan bootstrap session browser.

## Catatan Eksekusi

### Yang Bisa Dikerjakan Sekarang Tanpa Dependensi Eksternal
- Hardening runtime bot.
- Refactor service dan handler.
- Penambahan test unit.
- Scaffold folder `web/` non-interaktif bila memang ingin mulai struktur monorepo dulu.

### Yang Butuh Keputusan Produk atau Kredensial
- Magic link final.
- Desain pseudo-email auth.
- Integrasi web ke Supabase auth.
- Provisioning project Next.js lengkap beserta dependency install.
