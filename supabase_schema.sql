-- 🚀 HitungUang - Supabase Database Schema

-- 1. Tabel profil user yang terhubung ke akun Telegram
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  telegram_user_id TEXT UNIQUE NOT NULL,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  display_name TEXT,
  status_pekerjaan TEXT,
  target_pengeluaran_bulanan INTEGER,
  target_pemasukan_bulanan INTEGER,
  last_alert_month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy untuk user melihat profilnya sendiri
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. Tabel wallets (Dompet Tabungan)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nama_dompet TEXT NOT NULL,
  target_nominal INTEGER NOT NULL DEFAULT 0,
  terkumpul INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wallets" 
ON public.wallets FOR ALL 
USING (auth.uid() = user_id);

-- 3. Tabel transaksi utama
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  harga INTEGER NOT NULL,           -- dalam Rupiah
  kategori TEXT NOT NULL DEFAULT 'lainnya',
  lokasi TEXT,
  catatan_asli TEXT,                -- raw text dari Telegram
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  tipe TEXT DEFAULT 'pengeluaran',  -- 'pengeluaran' | 'pemasukan' | 'tabungan'
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk performa
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON public.transactions(tanggal);
CREATE INDEX IF NOT EXISTS idx_transactions_kategori ON public.transactions(kategori);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: User hanya bisa mengolah datanya sendiri
CREATE POLICY "Users can manage own transactions" 
ON public.transactions FOR ALL 
USING (auth.uid() = user_id);

-- Explicit dashboard-safe write policies for anon + authenticated clients.
-- The bot may still use the service role key server-side after Telegram lookup.
CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Functions & Triggers (Opsional: Sync profiles on auth signup)
-- User harus mendaftar via Web App agar data Telegram terhubung.
