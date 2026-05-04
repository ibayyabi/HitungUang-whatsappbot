# Web Dashboard PRD

Tanggal review: 2026-05-04

## Tujuan Produk

Web dashboard CuanBeres harus memberi user tampilan cepat dan jelas atas transaksi yang dicatat dari WhatsApp. Web juga menjadi tempat onboarding, registrasi, login aman, dan ringkasan visual.

## Target User

- User baru yang perlu menghubungkan nomor WhatsApp.
- User aktif yang ingin membaca ringkasan uang tanpa bertanya ke bot.
- User yang ingin memeriksa transaksi terbaru dan kategori pengeluaran.

## Goals

- User baru bisa daftar dari web atau dari link bot.
- User bisa masuk dashboard tanpa password memakai link aman.
- Dashboard menampilkan kondisi hari ini, minggu ini, tren, kategori, dan transaksi terbaru.
- Data dashboard hanya milik user yang sedang login.
- UI bekerja baik di mobile dan desktop.

## Non-Goals

- Dashboard belum menjadi aplikasi CRUD transaksi lengkap di fase awal.
- Dashboard belum menggantikan bot untuk input utama.
- Dashboard belum mendukung multi-currency.
- Dashboard belum mendukung role admin.
- Dashboard belum mendukung laporan pajak atau akuntansi.

## User Stories

- Sebagai visitor, saya ingin memahami produk dan mulai daftar dari landing page.
- Sebagai user baru, saya ingin memasukkan nomor WhatsApp dan nama agar akun terhubung.
- Sebagai user dari bot, saya ingin nomor WhatsApp otomatis terisi dan terkunci saat register.
- Sebagai user terdaftar, saya ingin meminta link masuk aman tanpa password.
- Sebagai user login, saya ingin melihat pemasukan dan pengeluaran hari ini.
- Sebagai user login, saya ingin melihat kategori pengeluaran terbesar.
- Sebagai user login, saya ingin melihat grafik harian dan mingguan.
- Sebagai user login, saya ingin melihat transaksi terbaru dari WhatsApp.

## Functional Requirements

### Landing Page

- Harus menampilkan brand CuanBeres.
- Harus menjelaskan catat via WhatsApp, dashboard 90 hari, dan link masuk aman.
- Harus punya CTA ke onboarding dan login.

Acceptance criteria:

- CTA onboarding membuka `/onboarding`.
- CTA login membuka `/login`.
- Halaman responsive di mobile dan desktop.

### Onboarding

- Harus menjelaskan dua jalur mulai: dari web dan dari WhatsApp.
- Harus memberi akses ke register.
- Harus memberi akses ke chat bot WhatsApp.

Acceptance criteria:

- User mobile melihat CTA register tanpa scroll ke atas.
- Tombol chat membuka `wa.me/<nomor-bot>`.
- Nomor bot harus bisa dikonfigurasi dari env atau config publik.

### Register

- Harus menerima nomor WhatsApp format Indonesia dan nama tampilan.
- Harus mengunci nomor jika datang dari link bot.
- Harus membuat Supabase Auth user dan profile.
- Harus memberi state sukses dan next step ke chat bot.

Acceptance criteria:

- Nomor valid `628...` bisa didaftarkan.
- Nomor invalid ditolak sebelum call API.
- Nomor sudah terdaftar memberi jalan ke login.
- Response sukses tidak membocorkan detail service role.

### Login Link

- User bisa meminta link masuk dengan nomor WhatsApp atau nama terdaftar.
- Link harus memakai purpose `login_web`.
- Link harus redirect ke `/dashboard`.
- Error harus memakai istilah WhatsApp.

Acceptance criteria:

- Nomor terdaftar menghasilkan link masuk.
- Nama ambigu ditolak dan minta nomor WhatsApp.
- Link invalid atau expired menampilkan recovery ke `/login`.

### Verify Session

- Verify page harus mendukung token hash, auth code, URL hash token, dan session existing.
- Redirect `next` harus aman dan hanya path relatif.
- Jika valid, user masuk ke target path.

Acceptance criteria:

- Magic link dari bot membuka dashboard.
- Magic link dari login web development membuka dashboard.
- `next=//evil.com` tidak boleh dipakai.

### Dashboard Summary

- Dashboard harus butuh session Supabase valid.
- Dashboard harus mengambil transaksi 90 hari terakhir.
- Dashboard harus menampilkan:
  - Sisa hari ini.
  - Pemasukan hari ini.
  - Pengeluaran hari ini.
  - Pengeluaran minggu ini.
  - Grafik 7 hari.
  - Grafik 4 minggu.
  - Kategori pengeluaran.
  - Transaksi terbaru.

Acceptance criteria:

- User tanpa session redirect ke `/login`.
- Data kosong menampilkan empty state.
- Error API menampilkan tombol retry.
- Refresh manual memuat ulang summary.
- Data tidak bocor antar user.

## Data Contract

`GET /api/dashboard/summary` harus mengembalikan:

```json
{
  "success": true,
  "balance": {
    "todayIncome": 0,
    "todayExpense": 0,
    "todayRemaining": 0,
    "weekIncome": 0,
    "weekExpense": 0
  },
  "dailySeries": [],
  "weeklySeries": [],
  "categories": [],
  "transactions": []
}
```

Jika gagal auth:

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

## UX Requirements

- Copy user-facing memakai WhatsApp, bukan Telegram.
- Empty state harus memberi next action ke WhatsApp.
- Loading state tidak boleh menggeser layout utama secara berlebihan.
- Rupiah harus memakai format `Rp 15.000`.
- Dashboard harus nyaman dibaca di layar mobile.

## Non-Functional Requirements

- Dashboard summary load target kurang dari 2 detik untuk 250 rows.
- API dashboard harus memakai Supabase session user, bukan service role.
- Register dan request-link boleh memakai service role hanya di server route.
- Semua route auth harus aman dari open redirect.
- UI harus tetap usable saat chart data kosong.

## Metrics

Metric produk yang perlu ditambahkan:

- Register started.
- Register success.
- Register duplicate number.
- Login link requested.
- Verify success.
- Verify failure.
- Dashboard loaded.
- Dashboard API error.
- Refresh clicked.

## Roadmap

### P0

- Pindahkan nomor bot dari hardcoded value ke config.
- Tambah logout UI.
- Tambah filter periode dashboard.
- Tambah filter tipe transaksi.
- Tambah eksplisit `.eq('user_id', user.id)` di summary API sebagai defense in depth.

### P1

- Search transaksi.
- Pagination atau infinite load transaksi.
- Export CSV.
- Edit kategori transaksi.
- Hapus transaksi dengan confirmation.

### P2

- Budget bulanan.
- Insight otomatis kategori naik/turun.
- Setting profil.
- Multi-account.
- Push summary mingguan ke WhatsApp.

## Open Questions

- Apakah input transaksi tetap hanya via WhatsApp, atau dashboard perlu form tambah transaksi?
- Apakah user boleh mengedit hasil parsing AI dari dashboard?
- Apakah dashboard harus real-time setelah bot insert, atau refresh manual cukup?
- Apakah periode 90 hari final atau perlu pilihan 7/30/90/custom?
