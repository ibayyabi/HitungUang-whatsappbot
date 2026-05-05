-- Guard normal wallet deposits so savings allocate from current-month available money.

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
  jakarta_month_start TIMESTAMP;
  month_start_utc TIMESTAMPTZ;
  next_month_start_utc TIMESTAMPTZ;
  month_income BIGINT := 0;
  month_expense BIGINT := 0;
  month_savings BIGINT := 0;
  available_money BIGINT := 0;
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

  jakarta_month_start := date_trunc('month', timezone('Asia/Jakarta', NOW()));
  month_start_utc := jakarta_month_start AT TIME ZONE 'Asia/Jakarta';
  next_month_start_utc := (jakarta_month_start + INTERVAL '1 month') AT TIME ZONE 'Asia/Jakarta';

  SELECT
    COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN harga ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN harga ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipe = 'tabungan' THEN harga ELSE 0 END), 0)
  INTO month_income, month_expense, month_savings
  FROM public.transactions
  WHERE user_id = p_user_id
    AND tanggal >= month_start_utc
    AND tanggal < next_month_start_utc;

  available_money := month_income - month_expense - month_savings;

  IF p_amount > available_money THEN
    RAISE EXCEPTION 'available money insufficient: available %, requested %', available_money, p_amount;
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

GRANT EXECUTE ON FUNCTION public.deposit_wallet_saving(UUID, UUID, BIGINT, TEXT) TO authenticated, service_role;
