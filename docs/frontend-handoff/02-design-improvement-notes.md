# Design Improvement Notes

Dokumen ini berisi arahan redesign dari sisi pengalaman pengguna. Tujuannya bukan mempertahankan style lama, tetapi menjaga flow yang sudah berjalan sambil membuat UI lebih jelas, konsisten, dan siap dipakai user non-teknis.

## Design Principles

- Gunakan bahasa user-facing: WhatsApp, CuanBeres, dashboard.
- Hindari istilah teknis seperti webhook, proxy email, token hash, atau Supabase di UI publik.
- Buat halaman terasa seperti produk operasional, bukan landing marketing panjang.
- CTA harus jelas: daftar, chat bot, masuk dashboard, perbarui data.
- Semua state penting harus terlihat: loading, success, error, empty data, unauthorized.
- Dashboard harus mudah dipindai cepat dari mobile maupun desktop.

## Landing Page

### Kondisi Saat Ini

- Sudah punya hero, feature cards, cara kerja, CTA onboarding, logo, dan preview image.
- Copy utama sudah menjelaskan pencatatan uang via WhatsApp.
- Visual masih bisa dibuat lebih product-led agar user langsung paham hasil akhirnya.

### Improvement

- Jadikan first viewport langsung menunjukkan:
  - Nama produk `CuanBeres`.
  - Manfaat utama: catat transaksi dari WhatsApp, lihat ringkasan di dashboard.
  - CTA utama: mulai daftar.
  - CTA sekunder: masuk dashboard.
- Preview visual sebaiknya menunjukkan kombinasi chat dan dashboard, bukan hanya gambar dekoratif.
- Kurangi section yang terasa repetitif antara fitur dan cara kerja.
- Pastikan CTA `Mulai` menuju `/onboarding` atau `/register` secara konsisten.
- Tambahkan trust cues ringan: data pribadi, magic link aman, bisa mulai dari chat.

## Onboarding

### Kondisi Saat Ini

- Onboarding menampilkan 3 langkah: daftar nomor, pindai QR, mulai chat.
- Ada CTA ke register.
- Ada preview QR WhatsApp.

### Improvement

- Buat onboarding sebagai task flow, bukan hanya halaman penjelasan.
- Jelaskan perbedaan alur:
  - User mulai dari web: isi nomor dan nama.
  - User mulai dari chat: nomor sudah terisi dari link bot.
- CTA mobile sticky sudah baik, tapi pastikan tidak menutup konten.
- QR/link WhatsApp perlu diberi state actionable: scan QR, buka chat, atau salin nomor.
- Jika QR statis hanya placeholder, tampilkan sebagai "buka chat bot" agar tidak memberi ekspektasi scan session WhatsApp.

## Register

### Kondisi Saat Ini

- Register menerima nomor WhatsApp dan nama tampilan.
- Query param `whatsapp` atau `telegram_user_id` mengunci field nomor.
- Setelah sukses, halaman menampilkan QR WhatsApp.

### Improvement

- Field nomor WhatsApp perlu validasi visual format `628...`.
- Saat nomor terkunci dari link bot, beri label bahwa nomor berasal dari WhatsApp bot.
- Success state harus memberi next action jelas:
  - Buka chat bot.
  - Kirim contoh transaksi.
  - Masuk dashboard jika sudah punya data.
- Error `Nomor WhatsApp sudah terdaftar` sebaiknya memberi CTA login.
- Jangan tampilkan istilah `Telegram User ID` di UI.

## Login dan Verify

### Kondisi Saat Ini

- Login meminta nomor WhatsApp atau nama terdaftar.
- API membuat magic link.
- Di non-production, preview link ditampilkan langsung.
- Verify memproses `token_hash`, `code`, hash access token, atau session existing.

### Improvement

- Samakan style login dengan register dan dashboard.
- Jelaskan login sebagai "minta link masuk aman", bukan "magic link" jika target user awam.
- Success state login perlu punya dua mode:
  - Development: tombol langsung dari `preview_link`.
  - Production: instruksi cek WhatsApp bot atau buka dari chat.
- Verify page perlu desain sederhana dengan:
  - Loading spinner.
  - Error link expired.
  - CTA ulangi login.
- Hindari visual lama seperti blob/background yang tidak konsisten dengan halaman baru.

## Dashboard

### Kondisi Saat Ini

- Dashboard read-only.
- Menampilkan sisa anggaran hari ini, pemasukan/pengeluaran hari ini, pengeluaran minggu ini, charts, kategori, dan tabel transaksi.
- Fetch data 90 hari terakhir dengan limit 250 transaksi.

### Improvement

- Perbaiki information hierarchy:
  - Top summary: pemasukan hari ini, pengeluaran hari ini, sisa hari ini, pengeluaran minggu ini.
  - Middle: tren harian/mingguan.
  - Bottom: kategori dan transaksi terbaru.
- Tambahkan empty states:
  - Belum ada transaksi.
  - Belum ada pengeluaran kategori.
  - Chart tanpa data.
- Tambahkan loading skeleton yang konsisten ukuran dengan final content.
- Tambahkan filter visual untuk periode jika backend sudah mendukung; jika belum, tampilkan periode statis "90 hari terakhir".
- Tabel transaksi perlu mobile pattern:
  - Desktop: table.
  - Mobile: list rows/cards ringkas.
- Kategori perlu warna konsisten dan readable, bukan hanya urutan total.
- Label dashboard masih menyebut "Ringkasan uang dari Telegram"; ubah copy user-facing menjadi WhatsApp.
- Pertimbangkan CTA empty dashboard: "Catat transaksi pertama di WhatsApp".

## Visual System

- Konsolidasikan warna brand agar tidak terlalu didominasi turquoise.
- Gunakan radius konsisten, idealnya 8px untuk kontrol dan card operasional.
- Gunakan icon lucide untuk action dan status.
- Hindari card di dalam card untuk layout utama.
- Typography perlu hierarki jelas: page title, section title, metric number, label.
- Pastikan semua button punya disabled/loading/focus state.
- Pastikan semua form field punya label, helper/error text, dan keyboard-friendly input mode.

