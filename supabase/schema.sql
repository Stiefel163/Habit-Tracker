-- Comeback: Supabase schema for cloud sync (not wired up yet; the app uses LocalStore).
-- One row per day mirrors AppData.days; settings is one JSON row per user.

create table if not exists days (
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date       date not null,
  log        jsonb not null,   -- e.g. {"training": ["gym"], "spanish": ["done"]}
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists settings (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table days enable row level security;
alter table settings enable row level security;
create policy "own days"     on days     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own settings" on settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
