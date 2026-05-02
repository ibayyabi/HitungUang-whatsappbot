-- Pivot identity from WhatsApp to Telegram.
-- For an existing database, fill telegram_user_id before setting NOT NULL if
-- whatsapp_number cannot be reused as a temporary value.

ALTER TABLE public.profiles
RENAME COLUMN whatsapp_number TO telegram_user_id;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

ALTER TABLE public.profiles
ALTER COLUMN telegram_user_id SET NOT NULL;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_whatsapp_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_user_id_key
ON public.profiles (telegram_user_id);
