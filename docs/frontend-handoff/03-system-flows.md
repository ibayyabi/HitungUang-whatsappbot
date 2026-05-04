# System Flows

Dokumen ini menjelaskan interaksi chatbot -> database -> frontend secara end-to-end.

## 1. User Mulai Dari Landing Page

1. User membuka `/`.
2. User klik CTA `Mulai` menuju `/onboarding`.
3. User membaca langkah ringkas lalu klik lanjut ke `/register`.
4. User mengisi nomor WhatsApp dan nama tampilan.
5. Frontend memanggil `POST /api/auth/register`.
6. API membuat Supabase Auth user dengan proxy email.
7. API upsert row ke `profiles`.
8. Register page menampilkan success state dan QR/link WhatsApp bot.
9. User membuka chat bot dan mulai mencatat transaksi.

## 2. User Mulai Dari Chatbot

1. User mengirim pesan ke nomor WhatsApp bot.
2. Fonnte mengirim webhook ke backend bot.
3. Backend membuat message adapter dari payload Fonnte.
4. Bot mencari user di `profiles` berdasarkan nomor WhatsApp.
5. Jika user belum terdaftar, bot membalas link `/register?telegram_user_id=<nomor>&whatsapp=<nomor>`.
6. Register page membaca query param dan mengunci field nomor WhatsApp.
7. User hanya mengisi nama tampilan.
8. Setelah registrasi sukses, user kembali ke WhatsApp dan mulai chat transaksi.

## 3. Chat Transaksi Sampai Dashboard

1. User mengirim teks seperti `bakso 15rb`, gambar struk, atau voice note.
2. Fonnte mengirim webhook ke backend.
3. Bot cek user terdaftar di `profiles`.
4. Bot mengklasifikasi pesan:
   - Command.
   - Pertanyaan analitik.
   - Transaksi teks/media.
   - Pesan yang diabaikan.
5. Untuk transaksi, bot memanggil Gemini parser.
6. Parser menghasilkan item terstruktur:
   - `item`
   - `harga`
   - `kategori`
   - `lokasi`
   - `tipe`
7. Backend validasi hasil parser.
8. Backend menyimpan row ke `transactions`.
9. Backend cek duplikat transaksi dari raw text dalam window pendek.
10. Bot membalas konfirmasi berhasil atau pesan duplikat.
11. Saat user membuka dashboard, frontend memanggil `GET /api/dashboard/summary`.
12. API membaca `transactions` milik session user.
13. Shared contract `aggregateDashboardSummary` membuat summary.
14. Dashboard render balance, chart, category summary, dan transaction table.

## 4. Tanya Data Dari Chat

1. User bertanya di WhatsApp, misalnya `total pengeluaran bulan ini?`.
2. Bot mengklasifikasi pesan sebagai pertanyaan.
3. Bot memanggil NL2SQL service.
4. Gemini membuat SQL SELECT.
5. Backend memvalidasi SQL:
   - Harus SELECT.
   - Harus dari tabel `transactions`.
   - Harus filter `user_id`.
   - Tidak boleh mengandung command mutasi.
6. Backend mengubah SQL menjadi query plan internal.
7. Backend fetch transaksi dari Supabase.
8. Backend format jawaban faktual dari rows.
9. Bot membalas ringkasan ke WhatsApp.

## 5. Login Dashboard Dari Chat

1. User mengetik `/dashboard`, `dashboard`, `login`, `akses dashboard`, atau `buka dashboard`.
2. Bot mencari profile berdasarkan nomor WhatsApp.
3. Bot memanggil auth link service.
4. Service memastikan profile punya Supabase Auth user.
5. Service generate magic link Supabase.
6. Service membungkus link ke URL `/verify`.
7. Bot mengirim link masuk ke WhatsApp.
8. User membuka link.
9. `/verify` memverifikasi token/session Supabase.
10. Setelah valid, user diarahkan ke `/dashboard`.

## 6. Login Dashboard Dari Web

1. User membuka `/login`.
2. User mengisi nomor WhatsApp atau nama terdaftar.
3. Frontend memanggil `POST /api/auth/request-link`.
4. API mencari profile.
5. API membuat magic link.
6. Di development, response menyertakan `preview_link`.
7. User membuka link, masuk ke `/verify`, lalu diarahkan ke `/dashboard`.

## Data Ownership

- Bot memakai service role key server-side untuk mencari profile dan insert transaksi.
- Frontend dashboard memakai Supabase session user.
- RLS memastikan user hanya membaca/mengelola data miliknya sendiri.
- `transactions.user_id` harus sama dengan `profiles.id` dan `auth.users.id`.

