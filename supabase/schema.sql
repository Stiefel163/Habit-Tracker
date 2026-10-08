-- Comeback: Supabase schema (not wired up yet; the app currently uses LocalStore).
-- Mirrors src/domain/types.ts so a SupabaseStore can implement src/data/store.ts 1:1.

create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date        date not null,
  habit       text not null check (habit in ('sleep','training','spanish','driving','create','supplements','noReels')),
  subtype     text,
  detail      text,
  duration_min integer,
  value       numeric,
  state       text not null check (state in ('done','partial','rest','skipped')),
  note        text,
  data        jsonb,           -- sleep: {bed, wake, sleepMin} · supplements: {taken: [...]}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists entries_user_date on entries (user_id, date);

create table if not exists day_notes (
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date       date not null,
  text       text not null check (char_length(text) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists settings (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  value      jsonb not null,   -- the Settings object
  updated_at timestamptz not null default now()
);

alter table entries   enable row level security;
alter table day_notes enable row level security;
alter table settings  enable row level security;

create policy "own entries"   on entries   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notes"     on day_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own settings"  on settings  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
