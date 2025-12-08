-- Keep usage counters in sync inside the same transaction as inserts/deletes to avoid drift.

create or replace function public.refresh_usage_counters(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_snippet_count integer;
  v_animation_count integer;
  v_folder_count integer;
begin
  perform ensure_usage_limits_row(p_user_id);

  select count(*) into v_snippet_count from public.snippet where user_id = p_user_id;
  select count(*) into v_animation_count from public.animation where user_id = p_user_id;
  select count(*) into v_folder_count from (
    select 1 from public.collection where user_id = p_user_id
    union all
    select 1 from public.animation_collection where user_id = p_user_id
  ) as folders;

  update public.usage_limits
     set snippet_count = v_snippet_count,
         animation_count = v_animation_count,
         folder_count = v_folder_count,
         updated_at = timezone('utc'::text, now())
   where user_id = p_user_id;

  update public.profiles
     set snippet_count = v_snippet_count,
         animation_count = v_animation_count,
         folder_count = v_folder_count
   where id = p_user_id;
end;
$$;

create or replace function public.refresh_usage_counters_from_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target_user_id uuid;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  if target_user_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  perform public.refresh_usage_counters(target_user_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_usage_on_snippet_change on public.snippet;
create trigger refresh_usage_on_snippet_change
after insert or delete or update of user_id on public.snippet
for each row execute procedure public.refresh_usage_counters_from_change();

drop trigger if exists refresh_usage_on_animation_change on public.animation;
create trigger refresh_usage_on_animation_change
after insert or delete or update of user_id on public.animation
for each row execute procedure public.refresh_usage_counters_from_change();

drop trigger if exists refresh_usage_on_collection_change on public.collection;
create trigger refresh_usage_on_collection_change
after insert or delete or update of user_id on public.collection
for each row execute procedure public.refresh_usage_counters_from_change();

drop trigger if exists refresh_usage_on_animation_collection_change on public.animation_collection;
create trigger refresh_usage_on_animation_collection_change
after insert or delete or update of user_id on public.animation_collection
for each row execute procedure public.refresh_usage_counters_from_change();
