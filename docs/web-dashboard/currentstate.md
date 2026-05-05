# Web Dashboard Current State

Tanggal review: 2026-05-05

## Ringkasan

Web dashboard adalah aplikasi Next.js di folder `web/`. Web menyediakan landing page, onboarding, registrasi, login link, verifikasi magic link, dan dashboard read-only untuk ringkasan transaksi 90 hari terakhir.

## Source Files

- App routes: `web/app/`
- Dashboard page: `web/app/dashboard/page.js`
- Dashboard client: `web/app/dashboard/DashboardClient.js`
- Summary API: `web/app/api/dashboard/summary/route.js`
- Register API: `web/app/api/auth/register/route.js`
- Login link API: `web/app/api/auth/request-link/route.js`
- Verify page: `web/app/verify/page.js`
- Supabase SSR client: `web/lib/supabase/`
- UI primitives: `web/components/ui/Primitives.js`
- Dashboard components: `web/components/dashboard/`
- Global styles: `web/app/globals.css`

## Stack

- Next.js 15
- React 19
- Supabase SSR
- Tailwind CSS 4
- Lucide React
- Recharts
- xlsx (Ekspor Excel)

## Route Map

| Route | Status | Fungsi |
| --- | --- | --- |
| `/` | Ada | Landing page produk. |
| `/onboarding` | Ada | Jalur mulai dari web atau WhatsApp. |
| `/register` | Ada | Registrasi nomor WhatsApp dan nama tampilan. |
| `/login` | Ada | Minta link masuk aman. |
| `/verify` | Ada | Verifikasi magic link, token hash, code, atau session hash. |
| `/dashboard` | Ada | Dashboard ringkasan transaksi, butuh session. |
| `/api/auth/register` | Ada | Buat Supabase Auth user dan profile. |
| `/api/auth/request-link` | Ada | Buat link masuk aman. |
| `/api/dashboard/summary` | Ada | Ambil transaksi dan agregasi dashboard. |

## Landing Dan Onboarding

Landing page menampilkan:

- Value proposition CuanBeres.
- Preview chat dan dashboard.
- CTA ke onboarding dan login.
- Fitur: catat WhatsApp, dashboard 90 hari, link masuk aman.

Onboarding menampilkan:

- Dua jalur mulai: dari web atau dari WhatsApp.
- Tiga langkah: isi identitas, buka kontak bot, catat transaksi.
- QR/contact card untuk WhatsApp.
- CTA sticky mobile ke register.

Nomor bot saat ini hardcoded sebagai `628123456789` di `web/components/ui/Primitives.js`.

## Register Flow

Halaman `/register`:

- Membaca query `whatsapp` atau `telegram_user_id`.
- Jika nomor dari query tersedia, field nomor dikunci.
- User mengisi nama tampilan.
- Frontend memanggil `POST /api/auth/register`.

API register:

1. Validasi `telegram_user_id` dan `display_name`.
2. Normalisasi nomor jadi digit.
3. Buat proxy email `tg-<nomor>@<domain>`.
4. Buat Supabase Auth user lewat admin API.
5. Upsert row ke `profiles`.
6. Return success message.

Jika nomor sudah terdaftar, UI memberi link ke login.

## Login Flow

Halaman `/login`:

- User mengisi nomor WhatsApp atau nama terdaftar.
- Frontend memanggil `POST /api/auth/request-link`.
- API memakai `src/services/authLinkService.js`.
- Di development, response bisa menyertakan `preview_link`.
- Di production, user diarahkan untuk meminta link dari WhatsApp bot.

Copy error disanitasi agar istilah Telegram berubah menjadi WhatsApp.

## Verify Flow

Halaman `/verify` mendukung:

- `token_hash` dan `type` lewat `supabase.auth.verifyOtp()`.
- `code` lewat `supabase.auth.exchangeCodeForSession()`.
- `access_token` dan `refresh_token` dari hash URL.
- Session existing dari Supabase client.

Setelah valid, user diarahkan ke `next` jika path aman, default `/dashboard`.

## Dashboard Auth Guard

`web/app/dashboard/page.js` membuat Supabase server client dan memanggil `auth.getUser()`.

- Jika tidak ada user, redirect ke `/login`.
- Jika session valid, render `DashboardClient`.

Middleware `web/middleware.js` refresh session Supabase untuk semua route non-static.

## Summary API

`GET /api/dashboard/summary`:

1. Membuat Supabase server client dari cookie user.
2. Validasi user session.
3. Query `transactions` untuk 90 hari terakhir.
4. Order by `tanggal` desc.
5. Limit 250 rows.
6. Agregasi dengan `aggregateDashboardSummary()`.

Query tidak menambahkan `.eq('user_id', user.id)` secara eksplisit. Data ownership saat ini mengandalkan Supabase RLS policy `auth.uid() = user_id`.

## Dashboard Data Model

Response summary:

- `balance.todayIncome`
- `balance.todayExpense`
- `balance.todayRemaining`
- `balance.availableMoney`
- `balance.weekIncome`
- `balance.weekExpense`
- `balance.monthSavings`
- `dailySeries`: 7 hari terakhir.
- `weeklySeries`: 4 minggu terakhir.
- `categories`: total dan count pengeluaran per kategori.
- `transactions`: rows transaksi dari Supabase.
- `profile`: data pengguna (termasuk target bulanan).
- `wallets`: daftar dompet/pos keuangan.

Agregasi berada di `shared/contracts/dashboardSummary.js`.

## Dashboard UI

Komponen:

- `BalanceMysteryCard`: sisa uang (berdiri sendiri *full-width* di atas).
- `MetricCard`: barisan metrik yang menggunakan *horizontal snap carousel* di mobile dan *Grid* di desktop.
- `ProfileTargetCard`: form target bulanan yang kini berupa panel *accordion* (bisa dilipat).
- `CategorySummary`: ranking kategori pengeluaran.
- `WalletSection`: rincian saldo dan sisa target per dompet.
- `ExpenseCharts`: bar chart harian dan mingguan dengan ukuran bar dinamis, legenda, format cerdas, dan efek *glassmorphism*.
- `TransactionTable`: riwayat transaksi desktop dan mobile.

Fitur tambahan:
- **Export Excel**: Tombol untuk mengunduh `.xlsx` dengan multi-sheet (Ringkasan, Kategori, Transaksi) di sisi *client*.

State yang sudah ada:

- Loading skeleton.
- Error fetch dengan tombol coba lagi.
- Empty state untuk kategori, grafik, dan transaksi.
- Refresh manual dengan tombol `Perbarui data`.

## Environment

Web membutuhkan:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `WEB_APP_URL`
- `AUTH_PROXY_EMAIL_DOMAIN`

Root `.env` dipakai bot. `web/.env` dibutuhkan saat menjalankan Next.js dari folder `web/`.

## Known Gaps

- Dashboard masih read-only; belum ada tambah, edit, hapus, filter, atau search transaksi.
- Tidak ada logout UI.
- Nomor WhatsApp bot masih hardcoded.
- Summary API mengandalkan RLS tanpa filter user eksplisit.
- Login web di production tidak mengirim link ke WhatsApp; user diarahkan memakai bot.
- Dashboard fetch data client-side setelah page load, belum server-hydrated.
- Tidak ada pagination transaksi.
- Tidak ada setting profil.
- Tidak ada preference mata uang, timezone, atau periode dashboard.
- Nama field API masih `telegram_*` walau copy user-facing WhatsApp.
