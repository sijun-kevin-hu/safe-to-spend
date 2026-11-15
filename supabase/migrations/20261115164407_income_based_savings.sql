-- Additive migration: existing fixed and balance-percentage plans are unchanged.
-- Apply after the legacy backend/sql/001-005 schema is present.
alter table public.plans
  add column if not exists savings_income_percentage numeric,
  add column if not exists income_savings_reserved numeric not null default 0;

alter table public.plans
  drop constraint if exists plans_income_savings_check,
  add constraint plans_income_savings_check check (
    (savings_income_percentage is null or savings_income_percentage between 0 and 100)
    and income_savings_reserved >= 0
    and income_savings_reserved < 'Infinity'::numeric
    and num_nonnulls(savings_amount, savings_percentage, savings_income_percentage) <= 1
  );

comment on column public.plans.savings_income_percentage is
  'Percentage allocated only when received income is logged; null selects a legacy savings method.';
comment on column public.plans.income_savings_reserved is
  'Accumulated virtual savings still included in the tracked balance; purchases and check-ins do not reduce it.';

notify pgrst, 'reload schema';
