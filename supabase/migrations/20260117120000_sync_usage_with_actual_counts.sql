-- Sync usage limit functions with actual table counts to avoid drift
-- Recomputes current counts from snippet/animation tables and stores them in usage_limits + profiles

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
         coalesce(sc.count, 0)
    into user_plan, current_count
    from public.profiles p
    left join lateral (
      select count(*) as count from public.snippet s where s.user_id = p.id
    ) sc on true
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
         coalesce(ac.count, 0)
    into user_plan, current_count
    from public.profiles p
    left join lateral (
      select count(*) as count from public.animation a where a.user_id = p.id
    ) ac on true
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
  plan_value public.user_plan;
  max_allowed integer;
  actual_count integer;
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

  select count(*) into actual_count from public.snippet where user_id = target_user_id;

  insert into public.usage_limits as ul (user_id, snippet_count, last_reset_at)
  values (target_user_id, actual_count, timezone('utc'::text, now()))
  on conflict (user_id) do update
    set snippet_count = excluded.snippet_count,
        last_reset_at = excluded.last_reset_at
  returning snippet_count into actual_count;

  update public.profiles
     set snippet_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'can_save', true,
    'current', actual_count,
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
  plan_value public.user_plan;
  max_allowed integer;
  actual_count integer;
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

  select count(*) into actual_count from public.animation where user_id = target_user_id;

  insert into public.usage_limits as ul (user_id, animation_count, last_reset_at)
  values (target_user_id, actual_count, timezone('utc'::text, now()))
  on conflict (user_id) do update
    set animation_count = excluded.animation_count,
        last_reset_at = excluded.last_reset_at
  returning animation_count into actual_count;

  update public.profiles
     set animation_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'can_save', true,
    'current', actual_count,
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
  actual_count integer;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  select count(*) into actual_count from public.snippet where user_id = target_user_id;

  insert into public.usage_limits as ul (user_id, snippet_count, last_reset_at)
  values (target_user_id, actual_count, timezone('utc'::text, now()))
  on conflict (user_id) do update
    set snippet_count = excluded.snippet_count,
        last_reset_at = excluded.last_reset_at
  returning snippet_count into actual_count;

  update public.profiles
     set snippet_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'current', actual_count
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
  actual_count integer;
begin
  if auth.uid() is distinct from target_user_id then
    raise exception 'Unauthorized';
  end if;

  select count(*) into actual_count from public.animation where user_id = target_user_id;

  insert into public.usage_limits as ul (user_id, animation_count, last_reset_at)
  values (target_user_id, actual_count, timezone('utc'::text, now()))
  on conflict (user_id) do update
    set animation_count = excluded.animation_count,
        last_reset_at = excluded.last_reset_at
  returning animation_count into actual_count;

  update public.profiles
     set animation_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   where id = target_user_id;

  return jsonb_build_object(
    'current', actual_count
  );
end;
$$;
