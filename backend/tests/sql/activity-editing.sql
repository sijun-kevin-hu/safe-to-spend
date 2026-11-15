\set ON_ERROR_STOP on
begin;
create temporary table activity_guard_test (activity_revision bigint not null default 0, purchases jsonb not null);
create trigger activity_guard before update on activity_guard_test for each row execute function public.preserve_savings_transfers();
insert into activity_guard_test values (0, '[{"id":"income","kind":"income","amount":100,"savingsAllocated":10,"savingsSavedAt":"2026-11-15T12:00:00Z"},{"id":"transfer","kind":"savings_transfer","amount":10}]');
do $$
begin
  begin
    update activity_guard_test set purchases='[]';
    raise exception 'Expected receipt deletion to fail';
  exception when sqlstate 'PT409' then null; end;
end $$;
-- An explicit correction can change receipts; identical retries are accepted.
update activity_guard_test set activity_revision=1, purchases='[{"id":"income","kind":"income","amount":50,"savingsAllocated":5}]';
update activity_guard_test set activity_revision=1, purchases=purchases;
do $$
begin
  begin
    update activity_guard_test set activity_revision=0;
    raise exception 'Expected stale revision to fail';
  exception when sqlstate 'PT409' then null; end;
  begin
    update activity_guard_test set purchases='[]';
    raise exception 'Expected conflicting same revision to fail';
  exception when sqlstate 'PT409' then null; end;
  begin
    update activity_guard_test set activity_revision=3;
    raise exception 'Expected skipped revision to fail';
  exception when sqlstate 'PT409' then null; end;
end $$;
-- Normal logging and savings completion still work after corrections.
update activity_guard_test set purchases=purchases || '[{"id":"purchase","kind":"purchase","amount":2}]';
update activity_guard_test set purchases='[{"id":"income","kind":"income","amount":50,"savingsAllocated":5,"savingsSavedAt":"2026-11-15T12:00:00Z"},{"id":"purchase","kind":"purchase","amount":2},{"id":"saved-income","kind":"savings_transfer","savingsSourceId":"income","amount":5,"createdAt":"2026-11-15T12:00:00Z"}]';
update activity_guard_test set activity_revision=2, purchases='[]';
rollback;
