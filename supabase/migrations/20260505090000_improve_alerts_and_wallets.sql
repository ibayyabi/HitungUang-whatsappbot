-- Improve profile alert settings and wallet priority/deposit support.

ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS jenis_dompet TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS priority_rank INTEGER,
ADD COLUMN IF NOT EXISTS monthly_target BIGINT,
ADD COLUMN IF NOT EXISTS is_default_income_wallet BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_one_default_income
ON public.wallets(user_id)
WHERE is_default_income_wallet IS TRUE AND archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.increment_wallet_balance(
  p_wallet_id UUID,
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_wallet public.wallets;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE public.wallets
  SET
    terkumpul = COALESCE(terkumpul, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_wallet_id
    AND user_id = p_user_id
    AND archived_at IS NULL
  RETURNING * INTO updated_wallet;

  IF updated_wallet.id IS NULL THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  RETURN updated_wallet;
END;
$$;

CREATE OR REPLACE FUNCTION public.deposit_wallet_saving(
  p_wallet_id UUID,
  p_user_id UUID,
  p_amount BIGINT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_wallet public.wallets;
  updated_wallet public.wallets;
  safe_note TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
  INTO target_wallet
  FROM public.wallets
  WHERE id = p_wallet_id
    AND user_id = p_user_id
    AND archived_at IS NULL
  FOR UPDATE;

  IF target_wallet.id IS NULL THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  safe_note := NULLIF(BTRIM(COALESCE(p_note, '')), '');

  INSERT INTO public.transactions (
    user_id,
    item,
    harga,
    kategori,
    lokasi,
    catatan_asli,
    tipe,
    wallet_id
  )
  VALUES (
    p_user_id,
    'Setoran ' || target_wallet.nama_dompet,
    p_amount,
    'tabungan',
    NULL,
    COALESCE(safe_note, 'Setoran dompet dari dashboard'),
    'tabungan',
    p_wallet_id
  );

  UPDATE public.wallets
  SET
    terkumpul = COALESCE(terkumpul, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_wallet_id
    AND user_id = p_user_id
  RETURNING * INTO updated_wallet;

  RETURN updated_wallet;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(UUID, UUID, BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deposit_wallet_saving(UUID, UUID, BIGINT, TEXT) TO authenticated, service_role;
