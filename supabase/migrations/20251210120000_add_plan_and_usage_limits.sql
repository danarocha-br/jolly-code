-- Plan and usage limits migration
-- Adds plan tracking to profiles, usage_limits table, and helper functions for atomic limit checks

-- Plan enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_plan') then
    create type public.user_plan as enum ('free', 'pro');
  end if;
end$$;

-- Profile plan + usage columns
alter table public.profiles
  add column if not exists plan public.user_plan not null default 'free',
  add column if not exists plan_updated_at timestamptz not null default timezone('utc'::text, now()),
  add column if not exists snippet_count integer not null default 0,
  add column if not exists animation_count integer not null default 0,
  add column if not exists subscription_id text,
  add column if not exists subscription_status text;

-- Usage limits table for quick lookups
create table if not exists public.usage_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  snippet_count integer not null default 0,
  animation_count integer not null default 0,
  last_reset_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.usage_limits enable row level security;

create policy "Users can view their usage limits" on public.usage_limits
  for select using (auth.uid() = user_id);

create policy "Users can upsert their usage limits" on public.usage_limits
  for insert with check (auth.uid() = user_id);

create policy "Users can update their usage limits" on public.usage_limits
  for update using (auth.uid() = user_id);

create policy "Users can delete their usage limits" on public.usage_limits
  for delete using (auth.uid() = user_id);

-- Helper to resolve plan/max limits
create or replace function public.check_snippet_limit(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan public.user_plan;
  current_count integer := 0;
  max_allowed integer;
  can_save boolean;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  select p.plan,
         coalesce(u.snippet_count, p.snippet_count, 0)
    into user_plan, current_count
    from public.profiles p
    left join public.usage_limits u on u.user_id = p.id
   where p.id = target_user_id;

  if user_plan is null then
    raise exception 'User not found for limit check';
  end if;

  if user_plan = 'pro' then
    max_allowed := null;
    can_save := true;
  else
    max_allowed := 10;
    can_save := current_count < max_allowed;
  end if;

  return jsonb_build_object(
    'can_save', can_save,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan
  );
end;
$$;

create or replace function public.check_animation_limit(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan public.user_plan;
  current_count integer := 0;
  max_allowed integer;
  can_save boolean;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  select p.plan,
         coalesce(u.animation_count, p.animation_count, 0)
    into user_plan, current_count
    from public.profiles p
    left join public.usage_limits u on u.user_id = p.id
   where p.id = target_user_id;

  if user_plan is null then
    raise exception 'User not found for animation limit check';
  end if;

  if user_plan = 'pro' then
    max_allowed := null;
    can_save := true;
  else
    max_allowed := 10;
    can_save := current_count < max_allowed;
  end if;

  return jsonb_build_object(
    'can_save', can_save,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan
  );
end;
$$;

create or replace function public.increment_snippet_count(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_check jsonb;
  new_count integer;
  plan_value public.user_plan;
  max_allowed integer;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  limit_check := public.check_snippet_limit(target_user_id);

  if (limit_check ->> 'can_save')::boolean is false then
    return jsonb_set(limit_check, '{error}', to_jsonb('limit_reached'::text));
  end if;

  plan_value := (limit_check ->> 'plan')::public.user_plan;
  if (limit_check ->> 'max') is not null then
    max_allowed := (limit_check ->> 'max')::integer;
  end if;

  insert into public.usage_limits as ul (user_id, snippet_count, last_reset_at)
  values (target_user_id, 1, timezone('utc'::text, now()))
  on conflict (user_id) do update
    set snippet_count = ul.snippet_count + 1
  returning snippet_count into new_count;

  update public.profiles
     set snippet_count = new_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'can_save', true,
    'current', new_count,
    'max', max_allowed,
    'plan', plan_value
  );
end;
$$;

create or replace function public.increment_animation_count(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_check jsonb;
  new_count integer;
  plan_value public.user_plan;
  max_allowed integer;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  limit_check := public.check_animation_limit(target_user_id);

  if (limit_check ->> 'can_save')::boolean is false then
    return jsonb_set(limit_check, '{error}', to_jsonb('limit_reached'::text));
  end if;

  plan_value := (limit_check ->> 'plan')::public.user_plan;
  if (limit_check ->> 'max') is not null then
    max_allowed := (limit_check ->> 'max')::integer;
  end if;

  insert into public.usage_limits as ul (user_id, animation_count, last_reset_at)
  values (target_user_id, 1, timezone('utc'::text, now()))
  on conflict (user_id) do update
    set animation_count = ul.animation_count + 1
  returning animation_count into new_count;

  update public.profiles
     set animation_count = new_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'can_save', true,
    'current', new_count,
    'max', max_allowed,
    'plan', plan_value
  );
end;
$$;

create or replace function public.decrement_snippet_count(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  update public.usage_limits
     set snippet_count = greatest(snippet_count - 1, 0)
   where user_id = target_user_id
  returning snippet_count into current_count;

  if current_count is null then
    current_count := 0;
    insert into public.usage_limits (user_id, snippet_count)
    values (target_user_id, 0)
    on conflict (user_id) do nothing;
  end if;

  update public.profiles
     set snippet_count = current_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'current', current_count
  );
end;
$$;

create or replace function public.decrement_animation_count(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  update public.usage_limits
     set animation_count = greatest(animation_count - 1, 0)
   where user_id = target_user_id
  returning animation_count into current_count;

  if current_count is null then
    current_count := 0;
    insert into public.usage_limits (user_id, animation_count)
    values (target_user_id, 0)
    on conflict (user_id) do nothing;
  end if;

  update public.profiles
     set animation_count = current_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'current', current_count
  );
end;
$$;
