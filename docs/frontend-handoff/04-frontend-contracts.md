# Frontend Contracts

Dokumen ini merangkum kontrak yang perlu diketahui frontend saat redesign. Jangan ubah payload atau nama field tanpa update backend.

## Register User

Endpoint:

```txt
POST /api/auth/register
```

Request body:

```json
{
  "telegram_user_id": "628123456789",
  "telegram_chat_id": "",
  "telegram_username": "",
  "display_name": "Ikhbar"
}
```

Catatan:

- `telegram_user_id` saat ini berisi nomor WhatsApp yang sudah dinormalisasi angka saja.
- `display_name` wajib.
- `telegram_chat_id` dan `telegram_username` opsional.
- UI boleh memakai label "Nomor WhatsApp", tetapi payload tetap `telegram_user_id`.

Success response:

```json
{
  "success": true,
  "message": "Registrasi berhasil! Silakan kembali ke WhatsApp untuk mulai mencatat, atau login ke Dashboard."
}
```

Common error:

```json
{
  "success": false,
  "message": "Nomor WhatsApp sudah terdaftar. Silakan login."
}
```

## Request Login Link

Endpoint:

```txt
POST /api/auth/request-link
```

Request body:

```json
{
  "telegram_user_id": "628123456789",
  "display_name": "Ikhbar",
  "purpose": "login_web",
  "redirect_to": "/dashboard"
}
```

Rules:

- Minimal isi salah satu dari `telegram_user_id` atau `display_name`.
- `purpose` yang dipakai untuk dashboard adalah `login_web`.
- `redirect_to` harus path internal, contoh `/dashboard`.

Success response:

```json
{
  "success": true,
  "message": "Link masuk sudah dibuat untuk akun 6281******89. Jika meminta dari halaman web, gunakan tombol tautan langsung yang muncul di bawah. Untuk dikirim ke chat Telegram, ketik \"dashboard\" di bot.",
  "delivery": "web_preview",
  "preview_link": "http://localhost:3000/verify?token_hash=..."
}
```

Catatan:

- `preview_link` hanya muncul saat `NODE_ENV !== "production"`.
- Message saat ini masih menyebut Telegram di sebagian copy; redesign UI sebaiknya mengganti copy user-facing menjadi WhatsApp.

## Dashboard Summary

Endpoint:

```txt
GET /api/dashboard/summary
```

Auth:

- Wajib session Supabase valid.
- Jika tidak valid, response `401 Unauthorized`.

Success response shape:

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
  "dailySeries": [
    {
      "date": "03 Mei",
      "pengeluaran": 0,
      "pemasukan": 0
    }
  ],
  "weeklySeries": [
    {
      "week": "W03 Mei",
      "pengeluaran": 0,
      "pemasukan": 0
    }
  ],
  "categories": [
    {
      "kategori": "makanan",
      "total": 15000,
      "count": 1
    }
  ],
  "transactions": [
    {
      "id": "uuid",
      "item": "Bakso",
      "harga": 15000,
      "kategori": "makanan",
      "lokasi": null,
      "catatan_asli": "bakso 15rb",
      "tanggal": "2026-05-03T00:00:00.000Z",
      "tipe": "pengeluaran",
      "created_at": "2026-05-03T00:00:00.000Z"
    }
  ]
}
```

Dashboard behavior:

- API mengambil transaksi 90 hari terakhir.
- API limit 250 rows.
- `dailySeries` selalu 7 bucket terakhir.
- `weeklySeries` selalu 4 bucket terakhir.
- `categories` hanya menghitung pengeluaran, bukan pemasukan.
- `todayRemaining = todayIncome - todayExpense`.

## Verify Page

Path:

```txt
/verify
```

Query/hash yang didukung:

- `token_hash` + `type`.
- `code`.
- `#access_token` + `refresh_token`.
- Existing Supabase session.

Behavior:

- Jika valid, redirect ke query `next` atau fallback `/dashboard`.
- `next` harus internal path.
- Jika invalid/expired, tampilkan pesan error dan CTA kembali login.

## Database Fields Frontend Perlu Tahu

### profiles

```txt
id                  uuid, sama dengan auth.users.id
telegram_user_id    text unique, saat ini berisi nomor WhatsApp
telegram_chat_id    text optional
telegram_username   text optional
display_name        text
created_at          timestamptz
```

### transactions

```txt
id             uuid
user_id        uuid owner profile
item           text
harga          integer rupiah
kategori       text
lokasi         text optional
catatan_asli   text raw input dari chat
tanggal        timestamptz
tipe           "pengeluaran" | "pemasukan"
created_at     timestamptz
```

## Frontend Copy Guidance

- User-facing: gunakan "WhatsApp".
- Internal/API payload: tetap pakai `telegram_*`.
- Produk: gunakan "CuanBeres".
- Hindari menyebut "magic link" jika user awam; gunakan "link masuk aman".

