# HitungUang — Desain Transformasi & Rencana Implementasi (PLANDESIGN.md)

## 1. Analisis Sumber Desain Baru ("Dia Browser" Style)
Berdasarkan dokumen `DESIGN.md` yang baru, HitungUang akan mengadopsi bahasa desain **"Dia Browser"**, yang memiliki karakteristik:
- **Achromatic & Minimal**: Tampilan didominasi warna monokrom (Canvas `#f8f8f8`, Fog `#efefef`, White).
- **Frosted Glass Depth**: Penggunaan *card* berwarna putih dengan *opacity* 90% dan `backdrop-filter: blur(24px)` untuk memberikan efek kaca buram dan kedalaman (depth) tanpa *shadow* yang keras.
- **Typography-Driven**: Mengandalkan *display text* yang tipis (weight 300) dengan *tracking* (letter-spacing) rapat untuk memberikan kesan elegan (seperti tinta di atas kertas).
- **Ambient Glow**: Alih-alih warna *solid* atau CTA yang mencolok, identitas visual disampaikan melalui kilauan gradien ambien di latar belakang atau elemen aksen.

**Kesesuaian dengan Spesifikasi Proyek HitungUang:**
Desain minimalis dan bersih ini sangat cocok untuk dashboard pencatatan keuangan (HitungUang) karena tidak mendistraksi *user* dari data (angka saldo, pengeluaran). Elemen WhatsApp *webhook*, Onboarding, dan tabel transaksi akan terlihat sangat premium dan modern layaknya aplikasi SaaS *high-end*.

## 2. Injeksi Palet Warna HitungUang (Ekstraksi Logo & Palette)
Meskipun kita menggunakan struktur dan *feel* dari Dia Browser, kita **tidak** akan menggunakan "Spectrum Gradient" (merah/pink/biru) milik Dia. Sebagai gantinya, kita akan memasukkan palet warna HitungUang (`color_palette.png` & `logo.png`):

| Name | Hex Code | Role dalam Sistem Dia |
|------|----------|-----------------------|
| **Brand Teal** | `#75DDD1` | Warna brand utama, elemen logo, aksen sukses pada transaksi |
| **Teal Light** | `#91F0E7` | Stop gradien, ambient glow |
| **Soft Peach** | `#EDB09C` | Stop gradien, ambient glow |
| **Warm Beige** | `#FAE5BA` | Stop gradien, highlight |
| **HitungUang Glow**| `linear-gradient(...)`| **Pengganti Spectrum Gradient**. Gradien dari Teal -> Light Teal -> Beige -> Peach yang ditempatkan secara halus (low opacity + blur) di belakang *Card* Dashboard atau Ilustrasi Onboarding. |

**Monokrom Base (Sesuai Dia Browser):**
- **Ink Black**: `#000000` (Teks Utama)
- **Graphite**: `#636363` (Teks Body)
- **Snow**: `#ffffff` (Card surface, 90% opacity)
- **Canvas**: `#f8f8f8` (Background dasar page)
- **Pebble**: `#d9d9d9` (Button dasar, *anti-CTA*)

## 3. Implementasi Tipografi & Layout
Sesuai `DESIGN.md`, tidak ada warna pada tombol CTA utama; semua tombol aksi netral (`#d9d9d9`) agar fokus *user* murni pada teks dan data.

- **Tipografi**: Karena HitungUang adalah app finansial, *display font* elegan seperti **Instrument Serif** (untuk *heading* tipis) atau **DM Sans / Plus Jakarta Sans** (weight 300 untuk *heading*, 400/500 untuk *body* dan angka) akan digunakan.
- **Card HitungUang (Dashboard)**: 
  - Background: `rgba(255,255,255,0.9)`
  - Backdrop Blur: `24px`
  - Border Radius: `30px`
  - Shadow: `rgba(0, 0, 0, 0.08) 0px 0px 8px 0px`
- **Dashboard Metric Card**: Setiap kartu ringkasan saldo / kategori tidak memiliki *border* garis, melainkan *shadow* 8px tipis dan *frosted glass* di atas *canvas* `#f8f8f8`.
- **Onboarding / Hero**: Halaman depan menampilkan *mockup* UI Dashboard (atau ilustrasi *chat* WhatsApp) yang melayang di atas *HitungUang Glow* (gradien Teal & Beige yang diburamkan).

---

## 4. Quick Start: Token Desain (Tailwind v4)

Berikut adalah modifikasi konfigurasi Tailwind berdasarkan perpaduan `DESIGN.md` (Dia) dan `color_palette.png` HitungUang:

```css
@theme {
  /* Monochrome Base (Dia Style) */
  --color-ink-black: #000000;
  --color-graphite: #636363;
  --color-slate: #959595;
  --color-snow: #ffffff;
  --color-canvas: #f8f8f8;
  --color-fog: #efefef;
  --color-pebble: #d9d9d9;

  /* HitungUang Brand Inject (Palette & Logo) */
  --color-brand-teal: #75DDD1;
  --color-brand-teal-light: #91F0E7;
  --color-brand-peach: #EDB09C;
  --color-brand-beige: #FAE5BA;
  
  /* HitungUang Glow (Pengganti Dia Spectrum) */
  --color-hitunguang-glow: #75DDD1; /* Fallback */
  --gradient-hitunguang-glow: linear-gradient(90deg, #75DDD1 0%, #91F0E7 33%, #FAE5BA 66%, #EDB09C 100%);

  /* Typography */
  /* Substitusi ABC Oracle -> DM Sans / Instrument Serif */
  --font-display: 'Instrument Serif', 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'DM Sans', 'Inter', ui-sans-serif, system-ui, sans-serif;

  /* Typographic Scale (Dia specs) */
  --text-heading-lg: 54px;
  --leading-heading-lg: 1.17;
  --tracking-heading-lg: -2.16px;
  
  --text-display: 72px;
  --leading-display: 1.11;
  --tracking-display: -2.88px;

  /* Border Radius */
  --radius-cards: 30px;
  --radius-buttons: 30px;
  --radius-navitems: 16px;
  --radius-pillbuttons: 9999px;

  /* Shadows */
  --shadow-sm: rgba(0, 0, 0, 0.08) 0px 0px 8px 0px;
}
```

## 5. Checklist Redesign untuk Frontend (Sesuai `05-redesign-checklist.md`)
Tim frontend dapat segera mengeksekusi dengan panduan ini:
- [ ] Ganti referensi bot dari "Telegram" menjadi "WhatsApp" di *Landing Page* dan *Dashboard*.
- [ ] Implementasikan halaman dengan `background: var(--color-canvas)` (`#f8f8f8`).
- [ ] Set komponen Card pada Dashboard menggunakan `bg-white/90`, `backdrop-blur-2xl`, dan `rounded-[30px]`.
- [ ] Buat animasi *ambient glow* menggunakan `--gradient-hitunguang-glow` yang diburamkan (`blur-3xl` atau `blur-2xl`) di bawah kartu saldo dashboard.
- [ ] Gunakan tombol netral (`#d9d9d9` dengan teks `#000000`) untuk interaksi seperti "Buat Catatan" atau navigasi form.
- [ ] Pastikan tidak ada warna solid pada *background section*; batas halaman hanya diatur oleh spasi kosong (80-120px) antar komponen.
