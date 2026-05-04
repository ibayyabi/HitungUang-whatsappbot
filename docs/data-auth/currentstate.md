# Data And Auth Current State

Tanggal review: 2026-05-04

## Ringkasan

CuanBeres memakai Supabase untuk Auth dan database. Bot memakai service role key server-side untuk lookup profile dan insert transaksi. Web memakai Supabase SSR session dan RLS untuk membaca data user.

Runtime user-facing memakai WhatsApp, tetapi schema masih memakai field `telegram_*`.

## Source Files

- Schema awal: `supabase_schema.sql`
- Migration identitas: `supabase/migrations/202605020001_telegram_identity.sql`
- DB service bot: `src/services/dbService.js`
- Auth link service: `src/services/authLinkService.js`
- Web Supabase client: `web/lib/supabase/`
- Register API: `web/app/api/auth/register/route.js`
- Request link API: `web/app/api/auth/request-link/route.js`
- Shared contracts: `shared/contracts/`

## Tables

### `profiles`

Field:

- `id`: UUID, primary key, references `auth.users`.
- `telegram_user_id`: TEXT unique not null. Secara produk berisi nomor WhatsApp user.
- `telegram_chat_id`: TEXT optional.
- `telegram_username`: TEXT optional.
- `display_name`: TEXT.
- `created_at`: TIMESTAMPTZ.

RLS:

- User hanya bisa melihat profile sendiri dengan `auth.uid() = id`.

### `transactions`

Field:

- `id`: UUID primary key.
- `user_id`: UUID references `profiles(id)`.
- `item`: TEXT.
- `harga`: INTEGER dalam Rupiah.
- `kategori`: TEXT.
- `lokasi`: TEXT optional.
- `catatan_asli`: TEXT raw input dari chat.
- `tanggal`: TIMESTAMPTZ default now.
- `tipe`: TEXT, `pengeluaran` atau `pemasukan`.
- `created_at`: TIMESTAMPTZ.

Index:

- `idx_transactions_user_id`
- `idx_transactions_tanggal`
- `idx_transactions_kategori`

RLS:

- User bisa manage transaksi sendiri dengan `auth.uid() = user_id`.
- Ada policy insert dan update eksplisit untuk own transactions.

## Identity Model

Satu Supabase Auth user sama dengan satu row `profiles`.

Mapping:

- `auth.users.id` = `profiles.id`
- `profiles.id` = `transactions.user_id`
- `profiles.telegram_user_id` = nomor WhatsApp yang dinormalisasi sebagai digit

Proxy email dibuat dengan format:

```txt
tg-<telegram_user_id>@<AUTH_PROXY_EMAIL_DOMAIN>
```

Meski prefix `tg-` dipakai, value saat ini berasal dari nomor WhatsApp.

## Register

`POST /api/auth/register`:

1. Menerima `telegram_user_id`, `telegram_chat_id`, `telegram_username`, `display_name`.
2. Normalisasi `telegram_user_id` jadi digit.
3. Buat Auth user lewat Supabase admin API.
4. Set `email_confirm: true`.
5. Simpan metadata user.
6. Upsert row `profiles`.

Jika Supabase Auth mengembalikan already registered, API membalas error nomor sudah terdaftar.

## Auth Link

Auth link bisa dibuat dari:

- Chatbot command dashboard.
- Web `/login`.

`authLinkService.requestAuthLink()`:

1. Validasi purpose dari `shared/contracts/auth.js`.
2. Cari profile berdasarkan `telegram_user_id` atau `display_name`.
3. Pastikan Auth user ada dan punya email.
4. Generate Supabase magic link.
5. Bungkus link ke `/verify`.

Purpose valid:

- `login_web`
- `summary_link`

## Session

Web memakai `@supabase/ssr`.

- Browser client: `web/lib/supabase/client.js`.
- Server client: `web/lib/supabase/server.js`.
- Middleware refresh session: `web/lib/supabase/middleware.js`.

Dashboard guard memakai `supabase.auth.getUser()`.

## Shared Contracts

`shared/contracts/finance.js`:

- Transaction type: `pengeluaran`, `pemasukan`.
- Expense categories: `makan`, `transport`, `belanja`, `hiburan`, `tagihan`, `kesehatan`, `pendidikan`, `lainnya`.
- Income categories: `gaji`, `freelance`, `bisnis`, `transfer_masuk`, `investasi`, `lainnya_masuk`.
- Default category: `lainnya`.
- Default type: `pengeluaran`.

`shared/contracts/dashboardSummary.js`:

- Agregasi balance harian dan mingguan.
- Series 7 hari dan 4 minggu.
- Ranking kategori pengeluaran.

`shared/contracts/profile.js`:

- Field profile yang dipakai service.

`shared/contracts/auth.js`:

- Purpose auth dan field request/verify.

## Data Flow

### Bot Insert

1. Webhook menerima pesan.
2. Bot lookup profile dengan `telegram_user_id`.
3. Parser menghasilkan transaksi.
4. Bot insert ke `transactions` dengan service role key.
5. `user_id` diambil dari profile.

### Dashboard Read

1. User login via magic link.
2. Browser punya session Supabase.
3. Summary API memakai server client dengan cookie user.
4. Query `transactions`.
5. RLS membatasi row ke `auth.uid() = user_id`.

## Security Posture

Sudah ada:

- RLS aktif untuk `profiles` dan `transactions`.
- Service role hanya dipakai server-side.
- Magic link dibuat lewat Supabase admin API.
- Redirect path disanitasi agar hanya path relatif.
- Purpose auth divalidasi.
- User data dashboard dibaca lewat anon key + session, bukan service role.

Perlu perhatian:

- Jangan expose `SUPABASE_SERVICE_KEY` ke client.
- Pastikan env production tidak menyertakan service key sebagai `NEXT_PUBLIC_*`.
- Summary API sebaiknya tetap menambahkan filter user eksplisit walau RLS sudah ada.
- Webhook secret harus diset di production.

## Known Gaps

- Naming schema `telegram_*` tidak sesuai runtime WhatsApp.
- Migration `202605020001_telegram_identity.sql` punya konteks pivot Telegram lama.
- Tidak ada migration formal untuk rename ke `whatsapp_*`.
- Tidak ada audit log perubahan transaksi.
- Tidak ada soft delete.
- Tidak ada profile settings table.
- Tidak ada per-user timezone setting.
- Duplicate detection hanya berbasis window 10 menit dan raw text.
- Tidak ada retention policy data.
