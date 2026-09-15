-- Apply before deploying the API. Existing plans become fixed-amount savings.
alter table public.plans
  add column if not exists savings_amount numeric,
  add column if not exists savings_percentage numeric;

update public.plans
set savings_amount = nullif(savings_goal, 0)
where savings_amount is null
  and savings_percentage is null;

alter table public.plans
  drop constraint if exists plans_savings_method_check,
  add constraint plans_savings_method_check check (
    (savings_amount is null or savings_amount >= 0)
    and (savings_percentage is null or savings_percentage between 0 and 100)
    and not (savings_amount is not null and savings_percentage is not null)
  );
