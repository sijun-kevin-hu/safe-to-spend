alter table public.plans add column if not exists savings_income_amount numeric;
alter table public.plans drop constraint if exists plans_income_savings_check;
alter table public.plans add constraint plans_income_savings_check check (
  (savings_income_percentage is null or savings_income_percentage between 0 and 100)
  and (savings_income_amount is null or (savings_income_amount >= 0 and savings_income_amount < 'Infinity'::numeric))
  and income_savings_reserved >= 0 and income_savings_reserved < 'Infinity'::numeric
  and num_nonnulls(savings_amount,savings_percentage,savings_income_percentage,savings_income_amount) <= 1
);
-- A stale snapshot or older app cannot erase a completed transfer or its receipt.
create or replace function public.preserve_savings_transfers() returns trigger
language plpgsql set search_path = '' as $$
declare entry jsonb;
begin
  for entry in select value from jsonb_array_elements(old.purchases) loop
    if entry->>'kind' = 'savings_transfer' or entry ? 'savingsSavedAt' then
      if not exists (select 1 from jsonb_array_elements(new.purchases) n where n = entry) then
        raise exception 'Savings history changed. Reload your plan before saving.' using errcode = '40001';
      end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.preserve_savings_transfers() from public, anon, authenticated;
drop trigger if exists preserve_savings_transfers on public.plans;
create trigger preserve_savings_transfers before update on public.plans
for each row execute function public.preserve_savings_transfers();
notify pgrst, 'reload schema';
