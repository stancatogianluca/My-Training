-- MY TRAINING 2.0 - STAGING ONLY. DO NOT RUN ON PRODUCTION.
-- Prerequisite: full Supabase DB backup + two test users + migration approval.
begin;
alter table public.training_items
  add column if not exists updated_at timestamptz,
  add column if not exists revision bigint,
  add column if not exists deleted_at timestamptz;
update public.training_items set updated_at=coalesce(updated_at,created_at), revision=coalesce(revision,1)
 where updated_at is null or revision is null;
alter table public.training_items alter column updated_at set default now();
alter table public.training_items alter column revision set default 1;
alter table public.training_items alter column updated_at set not null;
alter table public.training_items alter column revision set not null;
create index if not exists training_items_owner_updated_idx on public.training_items(user_id,updated_at,item_id);
-- Deliberately NO UPDATE grant or policy yet: clients cannot overwrite rows until
-- optimistic-concurrency RPC and RLS tests are implemented and reviewed.
commit;
