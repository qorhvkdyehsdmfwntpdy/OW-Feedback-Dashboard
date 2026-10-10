create or replace function public.get_hero_vote_rollup()
returns table (hero_key text, vote_count bigint, average_points numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    votes.hero_key,
    count(*)::bigint as vote_count,
    avg(case votes.tier
      when 'S' then 5::numeric
      when 'A' then 4::numeric
      when 'B' then 3::numeric
      when 'C' then 2::numeric
      else 1::numeric
    end) as average_points
  from public.hero_votes as votes
  group by votes.hero_key;
$$;

revoke all on function public.get_hero_vote_rollup() from public;
grant execute on function public.get_hero_vote_rollup() to anon, authenticated, service_role;
