-- Return a permanent HTTP conflict rather than retryable transaction rollback.
create or replace function public.preserve_savings_transfers() returns trigger
language plpgsql set search_path = '' as $$
declare entry jsonb;
begin
  if new.activity_revision = old.activity_revision + 1 then
    return new;
  end if;
  if new.activity_revision <> old.activity_revision then
    raise exception 'Activity changed elsewhere. Reload your plan before saving.' using errcode = 'PT409';
  end if;
  for entry in select value from jsonb_array_elements(old.purchases) loop
    -- After an explicit correction, protect every existing entry, including against stale clients.
    if old.activity_revision > 0 or entry->>'kind' = 'savings_transfer' or entry ? 'savingsSavedAt' then
      if not exists (select 1 from jsonb_array_elements(new.purchases) n where n = entry) then
        -- Normal completion may add a savings receipt to an existing income entry.
        if not (entry->>'kind' = 'income' and not (entry ? 'savingsSavedAt') and exists (
          select 1 from jsonb_array_elements(new.purchases) n
          where n - 'savingsSavedAt' = entry and n ? 'savingsSavedAt'
          and exists (select 1 from jsonb_array_elements(new.purchases) t
            where t->>'kind' = 'savings_transfer' and t->>'savingsSourceId' = entry->>'id'
            and t->>'createdAt' = n->>'savingsSavedAt'
            and (t->>'amount')::numeric = (entry->>'savingsAllocated')::numeric)
        )) then
          raise exception 'Activity changed elsewhere. Reload your plan before saving.' using errcode = 'PT409';
        end if;
      end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.preserve_savings_transfers() from public, anon, authenticated;
notify pgrst, 'reload schema';
