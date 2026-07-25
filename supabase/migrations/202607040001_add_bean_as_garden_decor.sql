insert into public.catalog_items(id, name, emoji, category, price, sort_order)
values ('bean-character', 'Bean', '🫘', 'garden', 0, 0)
on conflict (id) do update set active = true, price = 0;

insert into public.user_inventory(user_id, item_id)
select id, 'bean-character' from public.profiles
on conflict do nothing;

create or replace function public.create_user_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict do nothing;
  insert into public.user_inventory(user_id, item_id)
  select new.id, id from public.catalog_items where id in ('hat', 'lamp', 'meadow', 'bean-character')
  on conflict do nothing;
  return new;
end; $$;

create or replace function public.reset_own_progress()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  delete from public.capsules where user_id = v_uid;
  delete from public.garden_placements where user_id = v_uid;
  delete from public.token_ledger where user_id = v_uid;
  delete from public.observations where user_id = v_uid;
  delete from public.daily_quest_assignments where user_id = v_uid;
  delete from public.user_inventory where user_id = v_uid;
  insert into public.user_inventory(user_id, item_id)
  select v_uid, id from public.catalog_items where id in ('hat', 'lamp', 'meadow', 'bean-character');
  update public.profiles set user_name='', bean_name='', timezone='UTC', onboarding_screen='o1', tutorial_step=0,
    onboarding_completed_at=null, local_data_imported_at=null, tokens=10, equipped_outfit='none', equipped_backdrop='meadow', updated_at=now()
  where id=v_uid;
  update public.user_preferences set calendar_enabled=false, health_enabled=false, notifications_enabled=false, updated_at=now()
  where user_id=v_uid;
end; $$;

revoke execute on function public.reset_own_progress() from public, anon;
grant execute on function public.reset_own_progress() to authenticated;
