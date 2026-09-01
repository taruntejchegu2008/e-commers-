-- ============================================================
-- ShopEasy: fix the Supabase `orders` table for backend sync
-- ============================================================
-- The previous `orders` table had a broken status CHECK constraint
-- (it rejected every value except 'Shipped') and was missing the
-- columns the app needs (mongo_id, payment, shipping, items).
--
-- Run this whole block in the Supabase Dashboard -> SQL Editor.
-- It is idempotent: each ALTER only adds what is missing.

-- 0) Fix the broken status CHECK constraint: allow our real statuses.
--    Postgres can't ALTER a constraint by name; we drop + re-add it.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 1) Add the app columns (only if not already present).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mongo_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb;

-- 2) Add the corrected status constraint (our workflow values).
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'));

-- 3) Unique index so updates can target a row by mongo_id.
CREATE UNIQUE INDEX IF NOT EXISTS orders_mongo_id_key ON public.orders (mongo_id) WHERE mongo_id IS NOT NULL;

-- 4) Helpful updated_at default.
ALTER TABLE public.orders ALTER COLUMN updated_at SET DEFAULT now();
