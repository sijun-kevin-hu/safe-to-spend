-- Nullable for existing accounts: ask once before using a period.
ALTER TABLE public.plans ADD COLUMN pay_period jsonb;
ALTER TABLE public.plans ADD CONSTRAINT plans_pay_period_valid CHECK (
  pay_period IS NULL OR (
    jsonb_typeof(pay_period) = 'object'
    AND pay_period ?& ARRAY['frequency', 'nextPayday']
    AND pay_period->>'frequency' IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly')
    AND jsonb_typeof(pay_period->'nextPayday') = 'string'
    AND pay_period->>'nextPayday' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  )
);
COMMENT ON COLUMN public.plans.pay_period IS 'Pay schedule and original next payday anchor; window rolls forward on the client. Existing owner RLS applies.';
