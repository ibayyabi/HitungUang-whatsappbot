# Data And Auth PRD

Tanggal review: 2026-05-04

## Tujuan Produk

Lapisan data dan auth harus memastikan setiap transaksi CuanBeres terhubung ke pemilik yang benar, aman dibaca dari dashboard, dan konsisten dipakai oleh chatbot serta web.

## Goals

- Satu identitas user konsisten antara WhatsApp, Supabase Auth, profile, dan transaksi.
- Dashboard hanya menampilkan data milik session user.
- Bot hanya bisa mencatat transaksi untuk user terdaftar.
- Kontrak kategori, tipe transaksi, dan summary dipakai bersama.
- Auth link aman, terarah, dan tidak rentan open redirect.

## Non-Goals

- Tidak membuat custom auth provider sendiri.
- Tidak membuat multi-tenant organization di fase awal.
- Tidak membuat ledger double-entry.
- Tidak membuat data warehouse analytics.

## Entity Requirements

### User Profile

Profile harus menyimpan:

- Auth user id.
- Nomor WhatsApp normalized.
- Display name.
- Metadata chat optional.
- Timestamp created.

Acceptance criteria:

- Nomor WhatsApp unik.
- Satu Auth user punya satu profile.
- Profile bisa dicari dari bot berdasarkan nomor WhatsApp.

### Transaction

Transaction harus menyimpan:

- Owner user id.
- Item.
- Harga dalam Rupiah integer.
- Kategori.
- Lokasi optional.
- Raw chat text.
- Tanggal transaksi.
- Tipe transaksi.

Acceptance criteria:

- Transaksi tanpa owner ditolak.
- Harga harus angka positif.
- Tipe harus `pengeluaran` atau `pemasukan`.
- Kategori invalid harus fallback ke default yang valid.

## Auth Requirements

### Register

- Register harus membuat Auth user dan profile secara konsisten.
- Register harus idempotent terhadap duplicate number dengan pesan jelas.
- Proxy email boleh dipakai karena user login dengan WhatsApp identity, bukan email asli.

Acceptance criteria:

- Register sukses menghasilkan `auth.users` dan `profiles` dengan id sama.
- Register gagal tidak meninggalkan profile orphan jika Auth user gagal dibuat.
- Duplicate number tidak membuat Auth user baru.

### Login Link

- Login harus memakai Supabase magic link.
- Link harus punya purpose.
- Redirect target harus path relatif aman.
- Link dari bot dan web harus menuju `/verify`.

Acceptance criteria:

- Purpose invalid ditolak.
- Profile tidak ditemukan menghasilkan error publik yang aman.
- Nama display ambigu ditolak.
- Link expired menampilkan recovery ke login.

### Session

- Web dashboard harus membaca session dari cookie Supabase.
- Middleware harus refresh session.
- Route private harus redirect user tanpa session.

Acceptance criteria:

- `/dashboard` redirect ke `/login` tanpa session.
- User dengan session valid bisa fetch summary.
- Session user A tidak bisa membaca transaksi user B.

## Authorization Requirements

- RLS wajib aktif untuk `profiles`.
- RLS wajib aktif untuk `transactions`.
- Select dashboard wajib dibatasi ke `auth.uid() = user_id`.
- Insert/update client-side wajib dibatasi ke owner.
- Service role hanya boleh dipakai di server route atau bot service.

Acceptance criteria:

- Query anon tanpa session tidak membaca transaksi.
- Query authenticated hanya membaca own rows.
- Service role key tidak pernah masuk bundle client.

## Contract Requirements

Shared contracts harus menjadi rujukan tunggal untuk:

- Tipe transaksi.
- Kategori transaksi.
- Field profile.
- Purpose auth.
- Agregasi dashboard.

Acceptance criteria:

- Parser memakai kategori dari shared contract.
- Dashboard summary memakai aggregator shared.
- Test shared contract gagal jika kategori atau shape berubah tanpa update.

## Data Quality Requirements

- Nomor WhatsApp harus dinormalisasi menjadi digit.
- Harga harus integer Rupiah.
- `catatan_asli` harus disimpan untuk trace hasil AI.
- `tanggal` harus ada untuk semua transaksi.
- Duplicate detection harus mencegah retry pendek.

Acceptance criteria:

- `62812-345` tersimpan sebagai `62812345`.
- `15rb` tersimpan sebagai `15000`.
- Raw text user bisa dilihat di dashboard transaction table.
- Retry identik tidak membuat row ganda dalam window configured.

## Migration Requirements

- Setiap perubahan schema harus punya file migration.
- Migration harus menyebut dampak ke bot, web, dan RLS.
- Rename field identity harus punya compatibility plan.

Acceptance criteria:

- Migration bisa dijalankan di database kosong.
- Migration bisa dijalankan di database existing dengan data user.
- Dokumen current state diupdate setelah migration.

## Security Requirements

- `SUPABASE_SERVICE_KEY` hanya tersedia server-side.
- Webhook secret wajib untuk production.
- Redirect auth harus menolak absolute URL dan protocol-relative URL.
- Error public tidak boleh membocorkan detail Supabase admin.
- RLS policy harus dites manual sebelum production.

## Observability Requirements

Metric dan log yang perlu tersedia:

- Register success/failure.
- Duplicate identity.
- Auth link generated.
- Verify success/failure.
- Dashboard unauthorized.
- Bot insert success/failure.
- RLS denial atau Supabase query error.

## Roadmap

### P0

- Tambahkan filter user eksplisit pada summary API.
- Jadikan nomor bot dan proxy email domain terdokumentasi sebagai config.
- Tambah migration naming atau compatibility view untuk WhatsApp identity.
- Tambah checklist RLS production.

### P1

- Audit log transaksi.
- Soft delete transaksi.
- Profile settings untuk timezone dan preferensi dashboard.
- Per-user duplicate window setting.

### P2

- Multi-device session management.
- Export data user.
- Delete account flow.
- Data retention policy.

## Open Questions

- Apakah rename schema ke `whatsapp_user_id` perlu dilakukan sekarang atau ditunda?
- Apakah proxy email `tg-<id>` perlu diganti agar tidak membingungkan operator?
- Apakah user perlu memakai email asli untuk recovery?
- Apakah transaksi perlu menyimpan timezone lokal user selain `timestamptz`?
