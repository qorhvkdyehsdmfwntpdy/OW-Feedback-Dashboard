create extension if not exists pgcrypto;

create table if not exists public.squad_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  battle_tags jsonb not null check (jsonb_typeof(battle_tags) = 'array' and jsonb_array_length(battle_tags) between 1 and 5),
  gamemode text not null default 'competitive' check (gamemode in ('competitive', 'quickplay')),
  owner_tag text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists squad_teams_created_at_idx on public.squad_teams (created_at desc);

create table if not exists public.hero_votes (
  id uuid primary key default gen_random_uuid(),
  hero_key text not null,
  voter_id text not null check (char_length(voter_id) between 3 and 80),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('S', 'A', 'B', 'C', 'D')),
  comment text not null default '' check (char_length(comment) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hero_key, user_id)
);

create index if not exists hero_votes_hero_key_idx on public.hero_votes (hero_key);

create table if not exists public.lfg_posts (
  id uuid primary key default gen_random_uuid(),
  author_tag text not null check (char_length(author_tag) between 3 and 80),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  role text not null check (role in ('tank', 'damage', 'support', 'any')),
  rank text not null check (rank in ('any', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'champion')),
  gamemode text not null default 'competitive' check (gamemode in ('competitive', 'quickplay')),
  status text not null default 'open' check (status in ('open', 'closed')),
  applicants jsonb not null default '[]'::jsonb check (jsonb_typeof(applicants) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists lfg_posts_status_created_idx on public.lfg_posts (status, created_at desc);

alter table public.squad_teams enable row level security;
alter table public.hero_votes enable row level security;
alter table public.lfg_posts enable row level security;

drop policy if exists "Public can read shared squads" on public.squad_teams;
create policy "Public can read shared squads" on public.squad_teams for select using (is_public = true);
drop policy if exists "Anyone can create shared squads" on public.squad_teams;
drop policy if exists "Public can write shared squads" on public.squad_teams;

drop policy if exists "Anyone can read hero votes" on public.hero_votes;
create policy "Anyone can read hero votes" on public.hero_votes for select using (true);
drop policy if exists "Anyone can submit hero votes" on public.hero_votes;
drop policy if exists "Public can write hero votes" on public.hero_votes;
drop policy if exists "Anyone can update hero votes" on public.hero_votes;
drop policy if exists "Public can update hero votes" on public.hero_votes;

drop policy if exists "Anyone can read LFG posts" on public.lfg_posts;
create policy "Anyone can read LFG posts" on public.lfg_posts for select using (true);
drop policy if exists "Anyone can create LFG posts" on public.lfg_posts;
drop policy if exists "Public can write LFG posts" on public.lfg_posts;
drop policy if exists "Anyone can update LFG posts" on public.lfg_posts;
drop policy if exists "Public can update LFG posts" on public.lfg_posts;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lfg_posts'
     ) then
    alter publication supabase_realtime add table public.lfg_posts;
  end if;
end;
$$;
