-- Backfill usage counts for existing users

with snippet_counts as (
  select user_id, count(*) as snippet_count
  from public.snippet
  group by user_id
),
animation_counts as (
  select user_id, count(*) as animation_count
  from public.animation
  group by user_id
),
all_users as (
  select id from public.profiles
)
insert into public.usage_limits (user_id, snippet_count, animation_count, last_reset_at)
select
  u.id,
  coalesce(s.snippet_count, 0),
  coalesce(a.animation_count, 0),
  timezone('utc'::text, now())
from all_users u
left join snippet_counts s on s.user_id = u.id
left join animation_counts a on a.user_id = u.id
on conflict (user_id) do update
  set snippet_count = excluded.snippet_count,
      animation_count = excluded.animation_count,
      last_reset_at = excluded.last_reset_at;

-- Mirror counts into profiles for consistency
update public.profiles p
set snippet_count = coalesce(ul.snippet_count, 0),
    animation_count = coalesce(ul.animation_count, 0),
    plan_updated_at = timezone('utc'::text, now())
from public.usage_limits ul
where ul.user_id = p.id;
