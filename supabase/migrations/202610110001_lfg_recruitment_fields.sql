alter table public.lfg_posts
  add column if not exists author_nickname text not null default 'Player',
  add column if not exists purpose text not null default 'competitive',
  add column if not exists current_members integer not null default 1,
  add column if not exists total_members integer not null default 5,
  add column if not exists discord_id text,
  add column if not exists contact_battle_tag text;

alter table public.lfg_posts drop constraint if exists lfg_posts_role_check;
alter table public.lfg_posts add constraint lfg_posts_role_check
  check (role in ('tank', 'damage', 'healer', 'support', 'any'));

alter table public.lfg_posts drop constraint if exists lfg_posts_purpose_check;
alter table public.lfg_posts add constraint lfg_posts_purpose_check
  check (purpose in ('scrim', 'competitive', 'quickplay'));

alter table public.lfg_posts drop constraint if exists lfg_posts_current_members_check;
alter table public.lfg_posts add constraint lfg_posts_current_members_check
  check (current_members >= 1 and current_members <= 5);

alter table public.lfg_posts drop constraint if exists lfg_posts_total_members_check;
alter table public.lfg_posts add constraint lfg_posts_total_members_check
  check (total_members between 2 and 5 and current_members <= total_members);

alter table public.lfg_posts drop constraint if exists lfg_posts_discord_id_check;
alter table public.lfg_posts add constraint lfg_posts_discord_id_check
  check (discord_id is null or char_length(discord_id) <= 40);

alter table public.lfg_posts drop constraint if exists lfg_posts_author_nickname_check;
alter table public.lfg_posts add constraint lfg_posts_author_nickname_check
  check (char_length(author_nickname) between 1 and 40);

update public.lfg_posts
set purpose = case when gamemode = 'quickplay' then 'quickplay' else 'competitive' end,
    contact_battle_tag = coalesce(contact_battle_tag, author_tag),
  current_members = least(5, greatest(1, coalesce(jsonb_array_length(applicants), 0) + 1));

create table if not exists public.lfg_applications (
  post_id uuid not null references public.lfg_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.lfg_applications enable row level security;

insert into public.lfg_applications (post_id, user_id)
select posts.id, applicants.user_id::uuid
from public.lfg_posts as posts
cross join lateral jsonb_array_elements_text(posts.applicants) as applicants(user_id)
join auth.users as applicant_users on applicant_users.id = applicants.user_id::uuid
where applicants.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
on conflict do nothing;

update public.lfg_posts as posts
set current_members = least(posts.total_members, greatest(1, 1 + (
  select count(*)::integer from public.lfg_applications where post_id = posts.id
)));

alter table public.lfg_posts drop column if exists applicants;

create or replace function public.apply_lfg_post(p_post_id uuid, p_applicant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post public.lfg_posts%rowtype;
begin
  select * into target_post from public.lfg_posts where id = p_post_id for update;
  if not found then return 'not_found'; end if;
  if target_post.status <> 'open' then return 'closed'; end if;
  if target_post.author_id = p_applicant_id then return 'owner'; end if;
  if exists (select 1 from public.lfg_applications where post_id = p_post_id and user_id = p_applicant_id) then return 'already_applied'; end if;
  if target_post.current_members >= target_post.total_members then return 'full'; end if;

  insert into public.lfg_applications (post_id, user_id) values (p_post_id, p_applicant_id);
  update public.lfg_posts set current_members = current_members + 1 where id = p_post_id;
  return 'applied';
end;
$$;

revoke all on function public.apply_lfg_post(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_lfg_post(uuid, uuid) to service_role;
