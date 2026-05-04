-- Migration: Add profiling fields to profiles and create wallets table

-- 1. Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status_pekerjaan TEXT,
ADD COLUMN IF NOT EXISTS target_pengeluaran_bulanan INTEGER,
ADD COLUMN IF NOT EXISTS target_pemasukan_bulanan INTEGER,
ADD COLUMN IF NOT EXISTS last_alert_month TEXT;

-- 2. Create wallets table
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

-- 3. Add wallet_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;

-- Note: We assume the 'tipe' column in transactions is already a TEXT field and does not use a strictly enforced enum,
-- so we can just start inserting 'tabungan' as a type. If there's a constraint, we'd need to drop it here.
