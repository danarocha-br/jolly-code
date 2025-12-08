-- Ensure pg_cron is available for scheduling
DO $$
BEGIN
  BEGIN
    CREATE SCHEMA cron;
  EXCEPTION
    WHEN duplicate_schema THEN NULL;
  END;
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Ensure profiles keeps mirrored counters for drift detection
alter table public.profiles
  add column if not exists snippet_count integer default 0 not null,
  add column if not exists animation_count integer default 0 not null,
  add column if not exists folder_count integer default 0 not null,
  add column if not exists video_export_count integer default 0 not null,
  add column if not exists public_share_count integer default 0 not null;

-- Alerts table for drift
create table if not exists public.usage_drift_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  metric text not null check (metric in ('snippets','animations','folders','video_exports','public_shares')),
  previous_count integer not null,
  new_count integer not null,
  percent_drift numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists usage_drift_alerts_user_id_idx on public.usage_drift_alerts(user_id);
create index if not exists usage_drift_alerts_created_at_idx on public.usage_drift_alerts(created_at);

alter table public.usage_drift_alerts enable row level security;

-- Calculate actual usage counts for a user
create or replace function public.calculate_usage_counts(p_user_id uuid)
returns table(
  snippet_count integer,
  animation_count integer,
  folder_count integer,
  video_export_count integer,
  public_share_count integer
) language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.snippet s where s.user_id = p_user_id) as snippet_count,
    (select count(*) from public.animation a where a.user_id = p_user_id) as animation_count,
    (
      coalesce((select count(*) from public.collection c where c.user_id = p_user_id), 0) +
      coalesce((select count(*) from public.animation_collection ac where ac.user_id = p_user_id), 0)
    ) as folder_count,
    greatest(
      coalesce((select video_export_count from public.usage_limits ul where ul.user_id = p_user_id), 0),
      coalesce((select video_export_count from public.profiles p where p.id = p_user_id), 0)
    ) as video_export_count,
    greatest(
      coalesce((select count(*) from public.links l where l.user_id = p_user_id), 0),
      coalesce((select public_share_count from public.usage_limits ul2 where ul2.user_id = p_user_id), 0)
    ) as public_share_count;
$$;

-- Sync a single user's usage counts and alert on drift
create or replace function public.sync_user_usage_counts(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_counts record;
  previous_limits record;
  drift jsonb := '[]'::jsonb;
  metric_record record;
  percent numeric;
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if jwt_role is not null and jwt_role <> 'service_role' then
    raise exception 'Unauthorized';
  end if;

  select * into usage_counts from public.calculate_usage_counts(p_user_id);

  select snippet_count, animation_count, folder_count, video_export_count, public_share_count
    into previous_limits
    from public.usage_limits
   where user_id = p_user_id;

  insert into public.usage_limits as ul (user_id, snippet_count, animation_count, folder_count, video_export_count, public_share_count, last_reset_at)
  values (
    p_user_id,
    usage_counts.snippet_count,
    usage_counts.animation_count,
    usage_counts.folder_count,
    usage_counts.video_export_count,
    usage_counts.public_share_count,
    timezone('utc'::text, now())
  )
  on conflict (user_id) do update
    set snippet_count = excluded.snippet_count,
        animation_count = excluded.animation_count,
        folder_count = excluded.folder_count,
        video_export_count = excluded.video_export_count,
        public_share_count = excluded.public_share_count,
        last_reset_at = excluded.last_reset_at;

  update public.profiles
     set snippet_count = usage_counts.snippet_count,
         animation_count = usage_counts.animation_count,
         folder_count = usage_counts.folder_count,
         video_export_count = usage_counts.video_export_count,
         public_share_count = usage_counts.public_share_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = p_user_id;

  for metric_record in
    select * from (
      values
        ('snippets', coalesce(previous_limits.snippet_count, 0), usage_counts.snippet_count),
        ('animations', coalesce(previous_limits.animation_count, 0), usage_counts.animation_count),
        ('folders', coalesce(previous_limits.folder_count, 0), usage_counts.folder_count),
        ('video_exports', coalesce(previous_limits.video_export_count, 0), usage_counts.video_export_count),
        ('public_shares', coalesce(previous_limits.public_share_count, 0), usage_counts.public_share_count)
    ) as t(metric, previous_value, current_value)
  loop
    percent := case
      when metric_record.previous_value = 0 then case when metric_record.current_value = 0 then 0 else 100 end
      else round((abs(metric_record.current_value - metric_record.previous_value)::numeric * 100) / greatest(metric_record.previous_value, 1), 2)
    end;

    if percent > 10 then
      insert into public.usage_drift_alerts (user_id, metric, previous_count, new_count, percent_drift)
      values (p_user_id, metric_record.metric, metric_record.previous_value, metric_record.current_value, percent);

      drift := drift || jsonb_build_object(
        'metric', metric_record.metric,
        'previous', metric_record.previous_value,
        'current', metric_record.current_value,
        'percent', percent
      );

      perform pg_notify('usage_drift_alert', jsonb_build_object(
        'user_id', p_user_id,
        'metric', metric_record.metric,
        'previous', metric_record.previous_value,
        'current', metric_record.current_value,
        'percent', percent
      )::text);
    end if;
  end loop;

  return jsonb_build_object(
    'user_id', p_user_id,
    'counts', jsonb_build_object(
      'snippet_count', usage_counts.snippet_count,
      'animation_count', usage_counts.animation_count,
      'folder_count', usage_counts.folder_count,
      'video_export_count', usage_counts.video_export_count,
      'public_share_count', usage_counts.public_share_count
    ),
    'drift', drift
  );
end;
$$;

grant execute on function public.sync_user_usage_counts(uuid) to service_role;

-- RPC wrapper to allow manual re-sync
create or replace function public.force_sync_user_usage(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.sync_user_usage_counts(target_user_id);
$$;

grant execute on function public.force_sync_user_usage(uuid) to service_role;

-- Sync all users
create or replace function public.sync_all_user_usage_counts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in select id from public.profiles loop
    perform public.sync_user_usage_counts(rec.id);
  end loop;
end;
$$;

-- Weekly cron job Sunday 03:00 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job') THEN
    DELETE FROM cron.job WHERE jobname = 'weekly_usage_sync';
    INSERT INTO cron.job (schedule, command, jobname, nodename, nodeport, database, username)
    VALUES (
      '0 3 * * 0',
      'call public.sync_all_user_usage_counts();',
      'weekly_usage_sync',
      'localhost',
      5432,
      current_database(),
      current_user
    );
  END IF;
END $$;
