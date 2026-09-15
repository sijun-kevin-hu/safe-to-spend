-- Apply after 001_savings_percentage.sql, before deploying the updated API.
-- Existing owner-only RLS policies continue to protect these plan fields.
alter table public.plans
  add column if not exists tracking_preference text
    check (tracking_preference in ('purchases', 'balance')),
  add column if not exists balance_updated_at timestamptz,
  add column if not exists purchases jsonb not null default '[]'::jsonb
    check (jsonb_typeof(purchases) = 'array');
