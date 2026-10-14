-- Eseguire nel SQL Editor del proprio progetto Supabase, una sola volta.
-- My Training 1.6: un record per attività, accesso limitato al proprietario.
create table if not exists public.training_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind = 'workout'),
 item_id text not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key (user_id, kind, item_id)
);
alter table public.training_items enable row level security;
revoke all on public.training_items from anon;
grant select, insert on public.training_items to authenticated;
drop policy if exists "training_items_read_own" on public.training_items;
create policy "training_items_read_own" on public.training_items
 for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "training_items_insert_own" on public.training_items;
create policy "training_items_insert_own" on public.training_items
 for insert to authenticated with check ((select auth.uid()) = user_id);
-- Nessuna policy UPDATE/DELETE: sincronizzazione additiva, senza sovrascritture.
