# CuanBeres User Journey

## Entry Point 1: Landing Page

1. User membuka landing page CuanBeres.
2. User mengisi nama dan nomor WhatsApp.
3. Sistem membuat Supabase Auth user dengan proxy email dan menyimpan `profiles.whatsapp_number`.
4. Jika `WHATSAPP_DISPATCH_WEBHOOK_URL` aktif, sistem mengirim pesan pembuka otomatis ke WhatsApp user.
5. Jika dispatch otomatis belum aktif, user mendapat tombol `Chat Bot Sekarang` dengan prefilled `wa.me`.
6. User mulai chat bot dan mencatat transaksi.

## Entry Point 2: Chatbot Ditemukan Duluan

1. User mengirim pesan ke nomor bot.
2. Bot cek nomor WhatsApp di `profiles`.
3. Jika belum terdaftar, bot membalas link `/register?whatsapp=628xxx`.
4. User mengisi nama di halaman register.
5. Sistem membuat akun dan mengarahkan user kembali ke WhatsApp.
6. User mulai mencatat transaksi.

## Daily Usage

1. User mencatat transaksi via teks, gambar struk, atau voice note.
2. Bot parsing input dengan Gemini menjadi item, harga, kategori, lokasi, dan tipe transaksi.
3. Bot menyimpan transaksi ke Supabase.
4. Bot membalas konfirmasi dan mencegah duplikat dalam window pendek.
5. Jika salah catat, user bisa mengirim `hapus terakhir`.

## Query dan Dashboard

1. User bertanya di WhatsApp, misalnya `total pengeluaran bulan ini?`.
2. Bot mengubah pertanyaan menjadi query aman, membaca data Supabase, dan membalas ringkasan faktual.
3. User mengetik `dashboard`, `login`, `akses dashboard`, atau `buka dashboard`.
4. Bot membuat magic link dan mengirimkannya di WhatsApp.
5. User membuka link, `/verify` membuat session Supabase, lalu redirect ke `/dashboard`.
6. Dashboard menampilkan saldo hari ini, seri harian/mingguan, kategori, dan tabel transaksi.

## Delivery Mode

Pengiriman WhatsApp dari web mendukung dua mode:

- `WHATSAPP_DISPATCH_WEBHOOK_URL` aktif: web memanggil webhook/worker untuk mengirim pesan otomatis. Repo ini menyediakan endpoint bawaan di proses bot: `/dispatch/whatsapp`.
- Webhook belum aktif: web memberi link `wa.me` ke nomor `WHATSAPP_BOT_NUMBER`.

Mode kedua aman untuk tahap awal karena tidak mengasumsikan instance `whatsapp-web.js` bisa diakses langsung dari Next.js.

## Runbook Dev dengan Ngrok

1. Jalankan web di loopback lokal: `cd web && npm run dev`.
2. Di terminal lain, jalankan tunnel: `ngrok http 3000`.
3. Salin URL HTTPS ngrok, misalnya `https://<subdomain>.ngrok-free.app`.
4. Set `WEB_APP_URL=https://<subdomain>.ngrok-free.app` di `.env` root dan `web/.env`.
5. Pastikan `WHATSAPP_BOT_NUMBER` dan `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` berisi nomor bot format `628...`.
6. Restart proses bot dan web setelah `.env` berubah.
7. Di Supabase Auth redirect allowlist, tambahkan `${WEB_APP_URL}/verify`.
8. Smoke test: buka landing, daftar nomor sendiri, klik `Chat Bot Sekarang`, kirim `bakso 15rb`, lalu kirim `dashboard`.

`WEB_APP_URL` adalah source of truth untuk semua link publik dari bot dan magic link. Jika kosong saat dev, sistem fallback ke `http://localhost:3000`; untuk pesan bot ke user, fallback ini akan dicatat sebagai warning karena link tidak bisa dibuka dari luar mesin dev.

## Auto Chat Setelah Onboarding

Untuk membuat bot mengirim pesan otomatis setelah user daftar, aktifkan dispatch server di proses bot:

```env
WHATSAPP_DISPATCH_SERVER_ENABLED=true
WHATSAPP_DISPATCH_HOST=127.0.0.1
WHATSAPP_DISPATCH_PORT=3001
WHATSAPP_DISPATCH_WEBHOOK_SECRET=change-this-secret
```

Lalu di environment web (`web/.env`), arahkan webhook ke endpoint bot dengan secret yang sama:

```env
WHATSAPP_DISPATCH_WEBHOOK_URL=http://127.0.0.1:3001/dispatch/whatsapp
WHATSAPP_DISPATCH_WEBHOOK_SECRET=change-this-secret
```

Jalankan bot sampai status WhatsApp ready, lalu jalankan web. Saat onboarding berhasil, web akan POST ke endpoint bot. Jika bot belum ready, webhook membalas `503` dan web tetap memberi tombol `wa.me` sebagai fallback manual.
