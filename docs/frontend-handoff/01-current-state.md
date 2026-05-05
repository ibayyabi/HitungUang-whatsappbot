# Current State

Tanggal review: 2026-05-05

## Stack Saat Ini

- Bot backend: Node.js HTTP server di root project.
- Channel chat: WhatsApp via Fonnte webhook.
- AI parser: Gemini untuk parsing transaksi dari teks, gambar, dan audio.
- Database dan auth: Supabase Auth, Supabase database, RLS untuk data user.
- Frontend: Next.js di folder `web/`.
- Shared contracts: folder `shared/contracts/` untuk kategori transaksi, profile fields, auth purpose, dan agregasi dashboard.
- Test: Jest untuk service bot, parser, classifier, dashboard summary, dan kontrak shared.

## Fitur Yang Sudah Dikerjakan

### Chatbot

- Webhook Fonnte menerima pesan WhatsApp di `POST /webhook/fonnte`.
- Payload Fonnte dinormalisasi menjadi adapter pesan internal.
- Bot hanya memproses chat private.
- Bot cek registrasi user berdasarkan nomor WhatsApp yang disimpan di field `profiles.telegram_user_id`.
- User belum terdaftar mendapat link register dengan nomor WhatsApp terisi otomatis.
- Command utama:
  - `/start` atau `start`: cek status akun.
  - `/help` atau `help`: tampilkan bantuan.
  - `/dashboard`, `dashboard`, `login`, `akses dashboard`, `buka dashboard`: buat magic link dashboard.
- Bot mencatat transaksi dari teks natural seperti `bakso 15rb`.
- Bot mendukung media gambar untuk OCR struk dan audio/voice note untuk parsing transaksi.
- Bot mencegah duplikat transaksi identik dalam window pendek.
- Bot bisa menjawab pertanyaan natural language query, misalnya total pengeluaran, dengan query Supabase yang divalidasi.

### Database dan Auth

- `profiles` menyimpan identitas user, display name, dan identifier chat.
- `transactions` menyimpan item, harga, kategori, lokasi, catatan asli, tanggal, tipe transaksi, dan owner user.
- Registrasi web membuat Supabase Auth user dengan proxy email `tg-<id>@<domain>`.
- Magic link dibuat memakai Supabase admin API, lalu diverifikasi di halaman `/verify`.
- Dashboard hanya bisa dibuka jika session Supabase valid.

### Frontend

- Landing page ada di `/`.
- Onboarding ada di `/onboarding`.
- Register ada di `/register`.
- Login request form ada di `/login`.
- Magic link verification ada di `/verify`.
- Dashboard ada di `/dashboard`.
- Dashboard fetch data dari `GET /api/dashboard/summary`.
- Komponen dashboard saat ini (bergaya *Dia Browser*):
  - Balance card (Hero stat).
  - Metric cards (Horizontal snap carousel di mobile).
  - Profile Target Form (Collapsible accordion).
  - Category summary & Wallet section.
  - Daily/weekly charts (dengan ukuran dinamis dan format sumbu Y cerdas).
  - Transaction table.
  - Tombol Export Excel (.xlsx) mult-sheet.

## Catatan Inkonsistensi Naming

Ada mismatch penting yang perlu diketahui frontend engineer:

- Runtime aktual memakai WhatsApp/Fonnte.
- Banyak field dan pesan internal masih memakai nama `telegram_user_id`, `telegram_chat_id`, dan `telegram_username`.
- Beberapa dokumen lama di `docs/telegram-pivot/` menyebut pivot ke Telegram, tetapi kode runtime saat ini sudah kembali ke WhatsApp webhook Fonnte.
- UI baru sebaiknya memakai istilah user-facing `WhatsApp`, bukan `Telegram`.
- Kontrak API/database tidak perlu diganti saat redesign kecuali ada task backend khusus untuk migrasi naming.

## Risiko Saat Redesign

- Jangan mengubah nama field request/response API tanpa update backend.
- Jangan menghapus query param legacy seperti `telegram_user_id` karena masih dipakai untuk autofill register/login.
- Jangan menganggap dashboard punya fitur edit/delete/filter transaksi; saat ini dashboard hanya read-only summary.
- Jangan menampilkan copy Telegram ke user kecuali memang ada keputusan produk baru.

