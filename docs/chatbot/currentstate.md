# Chatbot Current State

Tanggal review: 2026-05-04

## Ringkasan

CuanBeres chatbot adalah HTTP webhook service Node.js untuk WhatsApp via Fonnte. Bot menerima pesan user, memeriksa registrasi di Supabase, memproses command, mencatat transaksi dengan Gemini, menjawab pertanyaan data sederhana, dan membuat link masuk dashboard.

Runtime aktif memakai WhatsApp. Field internal masih memakai nama `telegram_*` karena kontrak lama.

## Source Files

- Entry point: `src/index.js`
- Message handler: `src/handlers/messageHandler.js`
- Fonnte sender: `src/services/fonnteService.js`
- AI parser: `src/services/aiParser.js`
- NL query: `src/services/nl2sqlService.js`
- DB service: `src/services/dbService.js`
- Auth link: `src/services/authLinkService.js`
- Classifier: `src/utils/messageClassifier.js`
- Prompt parser: `src/config/prompts.js`
- Rate limiter: `src/utils/rateLimiter.js`
- Tests: `src/__tests__/`

## Runtime Dan Endpoint

Bot berjalan sebagai HTTP server memakai `node src/index.js`.

Endpoint:

- `GET /health`: health check sederhana, response platform `whatsapp-fonnte`.
- `POST /webhook/fonnte`: webhook pesan masuk dari Fonnte.
- `POST /webhook/fonnte/connect`: event connect Fonnte, hanya logging.
- `POST /webhook/fonnte/message-status`: event status pesan, hanya logging.

Path bisa diganti lewat environment:

- `FONNTE_WEBHOOK_PATH`
- `FONNTE_CONNECT_WEBHOOK_PATH`
- `FONNTE_MESSAGE_STATUS_WEBHOOK_PATH`

## Adapter Payload Fonnte

`src/index.js` menormalisasi payload Fonnte menjadi adapter internal:

- `text`: diambil dari `message`, `text`, `body`, `caption`, `content`, atau `quoted_message`.
- `senderId`: nomor dari `sender`, `from`, `number`, `whatsapp`, `target`, atau `phone`, dinormalisasi jadi digit.
- `chatId`: memakai `senderId`.
- `chatType`: selalu `private`.
- `hasMedia`: true jika payload punya URL media.
- `mediaType`: `image`, `audio`, `document`, atau `text`.
- `reply`: mengirim pesan via Fonnte.
- `downloadMedia`: download media dari URL payload lalu ubah ke base64.

## Registrasi User

Setiap pesan private dicek ke tabel `profiles` dengan:

- `profiles.telegram_user_id = senderId`

Secara produk, nilai ini adalah nomor WhatsApp user. Jika profile tidak ditemukan, bot membalas link registrasi:

```txt
/register?telegram_user_id=<nomor>&whatsapp=<nomor>&chat_id=<chatId>&username=<username>
```

Halaman web register memakai query ini untuk mengisi dan mengunci nomor WhatsApp.

## Command

Command yang didukung:

| Command | Perilaku |
| --- | --- |
| `/start`, `start` | Cek status akun terhubung dan beri instruksi singkat. |
| `/help`, `help`, `bantuan` | Tampilkan bantuan command dan contoh transaksi. |
| `/dashboard`, `dashboard`, `login`, `akses dashboard`, `buka dashboard` | Buat link masuk dashboard via Supabase magic link. |

## Klasifikasi Pesan

`src/utils/messageClassifier.js` membagi pesan menjadi:

- `media`: diproses sebagai image/audio bila ada media.
- `transaction`: teks berisi nominal dan indikasi transaksi.
- `question`: pertanyaan atau query data seperti total, summary, rekap.
- `ignore`: pesan tidak diproses.

Prioritas saat ini:

1. Media diproses sebagai transaksi.
2. Teks transaksi diproses sebelum pertanyaan.
3. Pertanyaan diproses sebagai NL query.
4. Pesan lain diabaikan tanpa balasan.

## Pencatatan Transaksi

Input transaksi:

- Teks natural, contoh `bakso 15rb`.
- Gambar struk dengan MIME `image/jpeg`, `image/png`, atau `image/webp`.
- Audio atau voice note.

Media dibatasi maksimal 5 MB setelah estimasi ukuran base64.

Parser memakai Gemini model `gemini-2.5-flash` dengan prompt di `src/config/prompts.js`. Output wajib JSON murni dan dinormalisasi menjadi:

- `item`
- `harga`
- `kategori`
- `lokasi`
- `tipe`: `pengeluaran` atau `pemasukan`

Kategori valid diambil dari `shared/contracts/finance.js`.

## Penyimpanan Transaksi

Transaksi disimpan ke Supabase tabel `transactions` lewat service role key.

Mapping field:

| Parser/Internal | Database |
| --- | --- |
| `userId` | `user_id` |
| `item` | `item` |
| `harga` | `harga` |
| `kategori` | `kategori` |
| `lokasi` | `lokasi` |
| `rawText` | `catatan_asli` |
| `tipe` | `tipe` |

Batch insert didukung lewat `appendTransactions()`.

## Idempotency

Bot mencegah duplikat transaksi identik dengan cara:

- Melihat transaksi user dalam 10 menit terakhir.
- Mencocokkan signature `item`, `harga`, `kategori`, `lokasi`, `tipe`, dan raw text.
- Jika semua item duplikat, bot membalas catatan sudah pernah tersimpan.
- Jika sebagian duplikat, item duplikat dilewati dan jumlahnya ditambahkan di balasan.

## NL Query

Pertanyaan user diproses oleh `src/services/nl2sqlService.js`.

Alur:

1. Sanitasi input.
2. Gemini membuat JSON berisi SQL SELECT.
3. SQL divalidasi ketat:
   - Harus `SELECT`.
   - Harus dari tabel `transactions`.
   - Harus punya filter `user_id`.
   - Tidak boleh ada statement mutasi atau komentar SQL.
4. SQL tidak dieksekusi langsung.
5. SQL diubah menjadi query plan internal.
6. Service fetch rows dari Supabase dan membuat jawaban faktual.

Metrik yang dikenali:

- `sum(harga)` untuk total.
- `count(*)` untuk jumlah catatan.
- daftar transaksi untuk query list.

Range waktu yang dikenali:

- hari ini
- minggu ini
- bulan ini
- seluruh periode

## Auth Link Dashboard

Saat user meminta dashboard, bot memanggil `authLinkService.requestAuthLink()` dengan:

- `telegramUserId`: nomor WhatsApp user.
- `purpose`: `login_web`.
- `redirectTo`: `/dashboard`.

Service:

1. Mencari profile.
2. Memastikan Supabase Auth user punya proxy email.
3. Generate magic link lewat Supabase admin API.
4. Membuat URL `/verify` dengan token hash bila tersedia.
5. Mengembalikan `actionLink` untuk dikirim ke WhatsApp.

## Security Dan Abuse Control

Kontrol yang sudah ada:

- Webhook secret opsional via header `x-webhook-secret` atau query `secret`.
- Rate limit in-memory: 10 request per sender per 60 detik.
- Bot hanya memproses chat private.
- Input teks disanitasi sebelum masuk prompt AI.
- SQL NL query divalidasi dan tidak dieksekusi langsung.
- User ownership transaksi mengikuti `user_id` dari profile.
- Media MIME dan ukuran divalidasi sebelum parsing.

## Environment

Variabel penting:

- `GEMINI_API_KEY`
- `PORT` atau `BOT_PORT`
- `FONNTE_TOKEN`
- `FONNTE_SEND_URL`
- `FONNTE_COUNTRY_CODE`
- `FONNTE_WEBHOOK_PATH`
- `FONNTE_PUBLIC_WEBHOOK_URL`
- `FONNTE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `WEB_APP_URL`
- `AUTH_PROXY_EMAIL_DOMAIN`

## Test Coverage

Test yang relevan:

- `src/__tests__/messageHandler.test.js`
- `src/__tests__/messageClassifier.test.js`
- `src/__tests__/aiParser.test.js`
- `src/__tests__/nl2sqlService.test.js`
- `src/__tests__/dbService.test.js`
- `src/__tests__/authLinkService.test.js`
- `src/__tests__/sharedContracts.test.js`

## Known Gaps

- Naming internal masih `telegram_*` walau produk memakai WhatsApp.
- Rate limiter in-memory hilang saat proses restart dan tidak shared antar instance.
- Webhook secret opsional; jika kosong, webhook menerima semua request.
- Download media belum punya timeout eksplisit.
- Tidak ada retry queue untuk gagal kirim pesan Fonnte.
- Bot number di UI web masih hardcoded di `web/components/ui/Primitives.js`.
- NL query masih bergantung pada output Gemini untuk membuat query plan awal.
- Tidak ada command untuk koreksi, edit, atau hapus transaksi dari chat.
- Tidak ada telemetry produk terstruktur selain log.
