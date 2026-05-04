# Redesign Checklist

Checklist ini dipakai saat frontend engineer mulai restrukturisasi desain.

## Before Editing

- Baca seluruh dokumen di `docs/frontend-handoff/`.
- Pastikan keputusan produk tetap WhatsApp, bukan Telegram.
- Audit halaman existing: `/`, `/onboarding`, `/register`, `/login`, `/verify`, `/dashboard`.
- Catat semua copy yang masih menyebut Telegram.
- Catat komponen reusable yang sudah ada: button, card, dashboard card, chart, table.

## Copy dan UX

- Ganti user-facing copy "Telegram" menjadi "WhatsApp" jika sesuai runtime saat ini.
- Pastikan CTA utama tiap halaman jelas.
- Pastikan register error `sudah terdaftar` punya arah ke login.
- Pastikan empty dashboard punya CTA mencatat transaksi pertama.
- Pastikan verify error punya CTA minta ulang link masuk.
- Hindari istilah teknis di UI publik.

## Visual System

- Tetapkan token warna brand, semantic success/error/warning, background, border, text.
- Tetapkan radius konsisten untuk input, button, card, modal, table row.
- Tetapkan typography scale untuk title, section heading, metric, body, caption.
- Standarisasi spacing section dan grid.
- Gunakan icon lucide untuk action/status yang umum.
- Pastikan dark mode dipilih secara sadar: support penuh atau nonaktifkan untuk halaman tertentu.

## Components

- Button punya state default, hover, active, disabled, loading, focus.
- Input punya label, helper text, error text, disabled/read-only state.
- Card tidak bersarang sebagai layout utama.
- Table punya mobile alternative.
- Chart punya loading dan empty state.
- Dashboard metric card tidak berubah ukuran saat data loading.
- Toast/alert/error banner konsisten antar halaman.

## Landing dan Onboarding

- First viewport landing langsung menjelaskan produk dan CTA.
- Preview visual menunjukkan chat + dashboard atau hasil produk nyata.
- Onboarding menampilkan progres langkah yang actionable.
- Register success menyediakan next action jelas ke WhatsApp bot.
- QR/link WhatsApp tidak terlihat seperti session QR internal jika hanya link kontak bot.

## Dashboard

- Header dashboard tidak menyebut Telegram.
- Top summary mudah dipindai dalam 5 detik.
- Tampilkan periode data yang sedang dipakai, saat ini 90 hari terakhir.
- Empty state untuk:
  - Tidak ada transaksi.
  - Tidak ada kategori pengeluaran.
  - Tidak ada data chart.
- Error fetch dashboard punya retry.
- Mobile layout tidak memaksa horizontal scroll kecuali untuk table desktop.

## QA Manual

- Landing desktop dan mobile.
- Onboarding desktop dan mobile.
- Register manual tanpa query param.
- Register dari link bot dengan query param nomor terkunci.
- Login request dengan nomor WhatsApp.
- Verify link valid.
- Verify link invalid/expired.
- Dashboard loading, data penuh, dan data kosong.
- Dashboard refresh button.
- Unauthorized dashboard redirect ke `/login`.

## Do Not Break

- Jangan rename payload `telegram_user_id` di API tanpa backend change.
- Jangan hapus support query param `whatsapp` dan `telegram_user_id`.
- Jangan ubah `GET /api/dashboard/summary` shape tanpa update dashboard components dan tests.
- Jangan mengasumsikan fitur edit/delete transaksi sudah tersedia.
- Jangan menghapus shared contracts yang dipakai backend dan frontend.

