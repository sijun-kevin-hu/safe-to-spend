-- Tracking preferences now belong to profiles.
alter table public.plans
  drop column tracking_preference;
