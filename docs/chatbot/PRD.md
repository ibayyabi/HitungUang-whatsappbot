# Chatbot PRD

Tanggal review: 2026-05-04

## Tujuan Produk

Chatbot CuanBeres harus menjadi cara tercepat untuk mencatat transaksi harian dari WhatsApp. User cukup mengirim pesan natural, struk, atau voice note; bot mengubah input menjadi data terstruktur yang langsung muncul di dashboard.

## Target User

- User individu yang ingin mencatat pengeluaran dan pemasukan tanpa membuka aplikasi finance.
- User yang lebih sering memakai WhatsApp daripada dashboard web.
- User yang butuh ringkasan cepat lewat chat.

## Goals

- Mencatat transaksi dari WhatsApp dalam kurang dari 1 menit.
- Mengurangi friction input manual: nominal, kategori, tipe, lokasi diparse otomatis.
- Memberi akses dashboard lewat link aman.
- Menjawab pertanyaan sederhana dari data transaksi aktual.
- Mencegah duplikat akibat retry webhook atau user mengirim pesan sama berkali-kali.

## Non-Goals

- Bot tidak menjadi aplikasi akuntansi lengkap.
- Bot tidak melakukan budgeting kompleks di fase ini.
- Bot tidak memproses grup WhatsApp.
- Bot tidak mengganti dashboard web untuk analisis visual.
- Bot tidak mengeksekusi SQL bebas dari AI.

## User Stories

- Sebagai user baru, saya ingin mendapat link register saat chat pertama agar bisa menghubungkan nomor WhatsApp.
- Sebagai user terdaftar, saya ingin mengirim `kopi 18rb` lalu transaksi tersimpan otomatis.
- Sebagai user, saya ingin mengirim beberapa item dalam satu pesan agar tidak perlu spam chat.
- Sebagai user, saya ingin mengirim struk atau voice note saat mengetik tidak praktis.
- Sebagai user, saya ingin bertanya `total pengeluaran bulan ini?` dan mendapat jawaban faktual.
- Sebagai user, saya ingin mengetik `dashboard` untuk mendapat link masuk.
- Sebagai user, saya ingin bot memberi pesan jelas saat input gagal dipahami.

## Functional Requirements

### Registrasi Dari Chat

- Jika nomor WhatsApp belum terdaftar, bot harus membalas link register.
- Link register harus membawa nomor WhatsApp agar form web dapat autofill dan lock field.
- Copy user-facing harus memakai istilah WhatsApp, bukan Telegram.

Acceptance criteria:

- Pesan dari nomor baru menghasilkan URL `/register`.
- Query param minimal berisi `whatsapp` dan `telegram_user_id`.
- User tidak terdaftar tidak boleh bisa mencatat transaksi.

### Command Dasar

- Bot harus mendukung command start, help, dan dashboard.
- Command dashboard harus membuat link masuk sekali pakai.
- Command help harus memberi contoh transaksi singkat.

Acceptance criteria:

- `/start` memberi status akun.
- `/help` menampilkan daftar command.
- `dashboard` mengembalikan URL yang membuka `/verify` lalu `/dashboard`.

### Catat Transaksi Teks

- Bot harus menerima teks natural dengan nominal.
- Bot harus membedakan pemasukan dan pengeluaran.
- Bot harus mendukung multi-item dalam satu pesan.
- Bot harus menyimpan raw text ke `transactions.catatan_asli`.

Acceptance criteria:

- `bakso 15rb` tersimpan sebagai pengeluaran dengan harga `15000`.
- `gaji freelance 2 juta` tersimpan sebagai pemasukan dengan harga `2000000`.
- Pesan multi-item menghasilkan beberapa row transaksi.
- Bot membalas ringkasan item yang tersimpan.

### Catat Transaksi Media

- Bot harus memproses gambar struk JPG, PNG, dan WebP.
- Bot harus memproses audio atau voice note.
- Bot harus menolak media lebih dari 5 MB.
- Bot harus menolak format media yang tidak didukung.

Acceptance criteria:

- Gambar valid diparse ke transaksi.
- Audio valid diparse ke transaksi.
- Media invalid mendapat pesan error spesifik.
- Media besar tidak dikirim ke Gemini.

### Anti-Duplikat

- Bot harus mendeteksi transaksi identik dalam window pendek.
- Bot harus melewati item duplikat tanpa menggagalkan item baru.

Acceptance criteria:

- Retry pesan sama dalam 10 menit tidak menambah row duplikat.
- Pesan batch dengan sebagian item baru tetap menyimpan item baru.
- Balasan menyebut jumlah item duplikat yang dilewati.

### Tanya Data Dari Chat

- Bot harus menjawab pertanyaan summary sederhana dari data aktual.
- Bot harus mendukung total, jumlah catatan, dan daftar transaksi.
- Bot harus mendukung range hari ini, minggu ini, bulan ini.
- Bot tidak boleh mengeksekusi SQL mutasi.

Acceptance criteria:

- `total pengeluaran bulan ini?` menjawab total dari Supabase.
- `berapa pemasukan minggu ini?` menjawab total pemasukan.
- Query tanpa data menjawab kosong, bukan halusinasi.
- SQL dari AI yang tidak valid ditolak.

### Error Handling

- Bot harus memberi pesan ramah saat parser gagal.
- Bot harus mencatat error ke logger.
- Webhook harus mengembalikan status HTTP sesuai hasil validasi.

Acceptance criteria:

- Payload tanpa sender mendapat 400.
- Rate limit mendapat 429 dan balasan WhatsApp.
- Error internal mendapat 500 tanpa membocorkan detail ke user.

## Non-Functional Requirements

- Response webhook normal maksimal 10 detik untuk teks.
- Secret webhook harus bisa diwajibkan di production.
- Service harus bisa shutdown bersih saat SIGINT/SIGTERM.
- Log harus cukup untuk tracing sender, mode proses, dan error.
- Parser harus toleran terhadap output AI dengan code fence atau teks tambahan.

## Data Requirements

Bot hanya boleh menulis transaksi untuk user terdaftar.

Field minimal transaksi:

- `user_id`
- `item`
- `harga`
- `kategori`
- `lokasi`
- `catatan_asli`
- `tipe`

Kategori dan tipe harus mengikuti `shared/contracts/finance.js`.

## UX Copy Requirements

- Pakai istilah "WhatsApp", "link masuk", dan "dashboard".
- Jangan tampilkan istilah internal seperti `telegram_user_id` ke user.
- Error harus memberi langkah berikutnya yang jelas.
- Balasan sukses harus menampilkan item dan nominal dengan format Rupiah.

## Metrics

Metric produk yang perlu ditambahkan:

- Jumlah pesan masuk.
- Jumlah transaksi berhasil.
- Jumlah parser failure.
- Jumlah duplikat dilewati.
- Jumlah link dashboard dibuat.
- Latency parse teks, image, audio.
- Rate limit hit.

## Roadmap

### P0

- Stabilkan copy WhatsApp di semua balasan.
- Wajibkan webhook secret di environment production.
- Tambah timeout download media dan fetch Fonnte.
- Dokumentasikan nomor bot dari env, bukan hardcoded.

### P1

- Command edit transaksi terakhir.
- Command hapus transaksi terakhir.
- Reminder pencatatan harian opsional.
- Kirim deep link dashboard setelah summary tertentu.

### P2

- Budget per kategori.
- Insight otomatis mingguan.
- Multi-account atau household.
- OCR struk dengan confidence dan review sebelum simpan.

## Open Questions

- Apakah produk tetap memakai field internal `telegram_*` atau perlu migrasi naming ke `whatsapp_*`?
- Apakah media harus auto-save tanpa preview, atau user perlu konfirmasi sebelum insert?
- Apakah dashboard link dari bot harus selalu satu kali pakai atau bisa session lebih panjang?
- Apakah bot perlu mengirim pesan saat transaksi gagal disimpan karena Supabase down?
