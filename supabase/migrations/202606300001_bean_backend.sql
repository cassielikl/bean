create extension if not exists pgcrypto;

create type public.observation_source as enum ('first_quest', 'daily', 'bonus', 'freeform');
create type public.seed_stage as enum ('unplanted', 'planted', 'sprout', 'bloomed');
create type public.catalog_category as enum ('outfit', 'garden', 'backdrop');
create type public.media_kind as enum ('photo', 'voice');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null default '',
  bean_name text not null default '',
  timezone text not null default 'UTC',
  onboarding_screen text not null default 'o1',
  tutorial_step integer not null default 0 check (tutorial_step >= 0),
  onboarding_completed_at timestamptz,
  local_data_imported_at timestamptz,
  tokens integer not null default 10 check (tokens >= 0),
  equipped_outfit text not null default 'none',
  equipped_backdrop text not null default 'meadow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quest_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null unique,
  category text not null default 'Moment',
  emoji text not null default '✨',
  is_daily boolean not null default true,
  is_bonus boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.bean_responses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  response text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.daily_quest_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  quest_id uuid not null references public.quest_prompts(id),
  completed_at timestamptz,
  observation_id uuid,
  created_at timestamptz not null default now(),
  unique(user_id, local_date)
);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_request_id uuid not null,
  quest_assignment_id uuid references public.daily_quest_assignments(id) on delete set null,
  source public.observation_source not null,
  prompt text not null,
  body text not null default '',
  category text not null default 'Moment',
  emoji text not null default '✨',
  created_at timestamptz not null default now(),
  unique(user_id, client_request_id)
);

alter table public.daily_quest_assignments
  add constraint daily_assignment_observation_fk
  foreign key (observation_id) references public.observations(id) on delete set null;

create table public.observation_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null references public.observations(id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now(),
  unique(user_id, storage_path)
);

create table public.memory_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null unique references public.observations(id) on delete cascade,
  planted_at timestamptz,
  harvested_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.garden_placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_id uuid references public.memory_seeds(id) on delete cascade,
  catalog_item_id text,
  x double precision not null check (x between 0 and 1),
  y double precision not null check (y between 0 and 1),
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((seed_id is not null) <> (catalog_item_id is not null))
);

create table public.catalog_items (
  id text primary key,
  name text not null,
  emoji text not null,
  category public.catalog_category not null,
  price integer not null check (price >= 0),
  active boolean not null default true,
  sort_order integer not null default 0
);

alter table public.garden_placements
  add constraint garden_placements_catalog_item_fk
  foreign key (catalog_item_id) references public.catalog_items(id);

create table public.user_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.catalog_items(id),
  acquired_at timestamptz not null default now(),
  primary key(user_id, item_id)
);

create table public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  reference_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, reason, reference_id)
);

create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, period_start)
);

create table public.capsule_observations (
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  observation_id uuid not null references public.observations(id) on delete cascade,
  primary key(capsule_id, observation_id)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calendar_enabled boolean not null default false,
  health_enabled boolean not null default false,
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_user_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict do nothing;
  insert into public.user_inventory(user_id, item_id)
  select new.id, id from public.catalog_items where id in ('hat', 'lamp', 'meadow')
  on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_user_defaults();

insert into public.quest_prompts(prompt, category, emoji, is_daily, is_bonus, sort_order) values
('What’s something about your current physical environment that you appreciate?', 'Moment', '✨', true, false, 1),
('What color caught your eye today?', 'Color', '🎨', true, true, 2),
('What sound made you pause?', 'Sound', '🎵', true, true, 3),
('What tiny thing made your space feel alive?', 'Moment', '🌱', true, true, 4),
('Where did you notice a little patch of light?', 'Light', '☀️', true, false, 5);

insert into public.bean_responses(category, response, sort_order) values
('Moment', 'I’m glad you showed me that little piece of your world.', 1),
('Color', 'That color sounds like a tiny signal from your world!', 1),
('Sound', 'I’ll remember that sound. Your world has so many layers.', 1),
('Light', 'Light behaves so beautifully here. Thank you for noticing it with me.', 1);

insert into public.catalog_items(id, name, emoji, category, price, sort_order) values
('hat', 'Tiny Hat', '🎩', 'outfit', 5, 1),
('cape', 'Leaf Cape', '🍃', 'outfit', 6, 2),
('scarf', 'Cloud Scarf', '🧣', 'outfit', 7, 3),
('lamp', 'Mushroom Lamp', '🍄', 'garden', 8, 1),
('stone', 'Garden Stone', '🪨', 'garden', 5, 2),
('meadow', 'Sunny Meadow', '🌼', 'backdrop', 0, 1),
('starlight', 'Starlight Backdrop', '🌌', 'backdrop', 10, 2);

create or replace function public.seed_sprout_interval()
returns interval language sql stable set search_path = '' as $$
  select case when current_setting('app.bean_growth_mode', true) = 'development' then interval '10 seconds' else interval '2 hours' end;
$$;

create or replace function public.seed_bloom_interval()
returns interval language sql stable set search_path = '' as $$
  select case when current_setting('app.bean_growth_mode', true) = 'development' then interval '30 seconds' else interval '5 hours' end;
$$;

create or replace function public.current_seed_stage(p_planted_at timestamptz)
returns public.seed_stage language sql stable set search_path = '' as $$
  select case
    when p_planted_at is null then 'unplanted'::public.seed_stage
    when now() >= p_planted_at + public.seed_bloom_interval() then 'bloomed'::public.seed_stage
    when now() >= p_planted_at + public.seed_sprout_interval() then 'sprout'::public.seed_stage
    else 'planted'::public.seed_stage
  end;
$$;

create or replace function public.get_daily_quest(p_local_date date)
returns table(assignment_id uuid, quest_id uuid, prompt text, category text, emoji text, completed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_quest uuid;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select id into v_quest from public.quest_prompts
  where active and is_daily order by mod(abs(hashtext(p_local_date::text)), 2147483647) + sort_order limit 1;
  insert into public.daily_quest_assignments(user_id, local_date, quest_id)
  values(v_uid, p_local_date, v_quest) on conflict(user_id, local_date) do nothing;
  return query select a.id, q.id, q.prompt, q.category, q.emoji, a.completed_at
  from public.daily_quest_assignments a join public.quest_prompts q on q.id = a.quest_id
  where a.user_id = v_uid and a.local_date = p_local_date;
end; $$;

create or replace function public.import_legacy_profile(
  p_user_name text, p_bean_name text, p_onboarding_screen text,
  p_tutorial_step integer, p_tokens integer
) returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set
    user_name=left(coalesce(p_user_name,''),80),
    bean_name=left(coalesce(p_bean_name,''),80),
    onboarding_screen=coalesce(nullif(p_onboarding_screen,''),'o1'),
    tutorial_step=greatest(0,least(coalesce(p_tutorial_step,0),100)),
    tokens=greatest(tokens,least(greatest(coalesce(p_tokens,10),10),10000)),
    local_data_imported_at=now(), updated_at=now()
  where id=auth.uid() and local_data_imported_at is null;
  return found;
end; $$;

create or replace function public.submit_observation(
  p_client_request_id uuid, p_source public.observation_source, p_prompt text,
  p_body text, p_category text, p_emoji text, p_assignment_id uuid default null
) returns table(observation_id uuid, seed_id uuid, bean_response text)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_observation uuid; v_seed uuid; v_response text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select id into v_observation from public.observations where user_id=v_uid and client_request_id=p_client_request_id;
  if v_observation is null then
    insert into public.observations(id, user_id, client_request_id, quest_assignment_id, source, prompt, body, category, emoji)
    values(p_client_request_id, v_uid, p_client_request_id, p_assignment_id, p_source, p_prompt, coalesce(p_body,''), p_category, p_emoji)
    returning id into v_observation;
    insert into public.memory_seeds(user_id, observation_id) values(v_uid, v_observation) returning id into v_seed;
    if p_assignment_id is not null then
      update public.daily_quest_assignments set completed_at=now(), observation_id=v_observation
      where id=p_assignment_id and user_id=v_uid and completed_at is null;
    end if;
  else
    select id into v_seed from public.memory_seeds where observation_id=v_observation;
  end if;
  select response into v_response from public.bean_responses where active and category=p_category order by sort_order limit 1;
  if v_response is null then select response into v_response from public.bean_responses where active order by sort_order limit 1; end if;
  return query select v_observation, v_seed, v_response;
end; $$;

create or replace function public.plant_seed(p_seed_id uuid)
returns timestamptz language plpgsql security definer set search_path=public as $$
declare v_planted timestamptz;
begin
  update public.memory_seeds set planted_at=coalesce(planted_at, now())
  where id=p_seed_id and user_id=auth.uid() returning planted_at into v_planted;
  if v_planted is null then raise exception 'seed not found'; end if;
  return v_planted;
end; $$;

create or replace function public.harvest_seed(p_seed_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_tokens integer;
begin
  update public.memory_seeds set harvested_at=now()
  where id=p_seed_id and user_id=v_uid and harvested_at is null
    and planted_at is not null and now() >= planted_at + public.seed_bloom_interval();
  if not found then raise exception 'flower is not ready or already harvested'; end if;
  insert into public.token_ledger(user_id, amount, reason, reference_id)
  values(v_uid, 10, 'flower_harvest', p_seed_id::text);
  update public.profiles set tokens=tokens+10, updated_at=now() where id=v_uid returning tokens into v_tokens;
  return v_tokens;
end; $$;

create or replace function public.purchase_item(p_item_id text)
returns integer language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_price integer; v_tokens integer;
begin
  select price into v_price from public.catalog_items where id=p_item_id and active for update;
  if v_price is null then raise exception 'item not found'; end if;
  if exists(select 1 from public.user_inventory where user_id=v_uid and item_id=p_item_id) then
    select tokens into v_tokens from public.profiles where id=v_uid; return v_tokens;
  end if;
  update public.profiles set tokens=tokens-v_price, updated_at=now()
  where id=v_uid and tokens>=v_price returning tokens into v_tokens;
  if v_tokens is null then raise exception 'not enough tokens'; end if;
  insert into public.user_inventory(user_id,item_id) values(v_uid,p_item_id);
  if v_price > 0 then insert into public.token_ledger(user_id,amount,reason,reference_id) values(v_uid,-v_price,'store_purchase',p_item_id); end if;
  return v_tokens;
end; $$;

create or replace function public.ensure_weekly_capsules()
returns table(id uuid, period_start timestamptz, period_end timestamptz, created_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_start timestamptz;
  v_period_start timestamptz;
  v_capsule uuid;
  v_index integer;
  v_complete_periods integer;
begin
  select onboarding_completed_at into v_start from public.profiles where profiles.id=v_uid;
  if v_start is null then return; end if;
  v_complete_periods := floor(extract(epoch from (now()-v_start))/604800);
  if v_complete_periods > 0 then
    for v_index in 0..v_complete_periods-1 loop
      v_period_start := v_start + (v_index * interval '7 days');
      insert into public.capsules(user_id,period_start,period_end)
      values(v_uid,v_period_start,v_period_start+interval '7 days')
      on conflict(user_id,period_start) do update set period_end=excluded.period_end
      returning capsules.id into v_capsule;
      insert into public.capsule_observations(capsule_id,observation_id)
      select v_capsule,o.id from public.observations o
      where o.user_id=v_uid and o.created_at>=v_period_start and o.created_at<v_period_start+interval '7 days'
      on conflict do nothing;
    end loop;
  end if;
  return query select c.id,c.period_start,c.period_end,c.created_at from public.capsules c where c.user_id=v_uid order by c.period_start desc;
end; $$;

alter table public.profiles enable row level security;
alter table public.daily_quest_assignments enable row level security;
alter table public.observations enable row level security;
alter table public.observation_media enable row level security;
alter table public.memory_seeds enable row level security;
alter table public.garden_placements enable row level security;
alter table public.user_inventory enable row level security;
alter table public.token_ledger enable row level security;
alter table public.capsules enable row level security;
alter table public.capsule_observations enable row level security;
alter table public.user_preferences enable row level security;
alter table public.quest_prompts enable row level security;
alter table public.bean_responses enable row level security;
alter table public.catalog_items enable row level security;

create policy "read active quests" on public.quest_prompts for select to authenticated using(active);
create policy "read active responses" on public.bean_responses for select to authenticated using(active);
create policy "read active catalog" on public.catalog_items for select to authenticated using(active);

create policy "own profile" on public.profiles for select to authenticated using(id=auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "own assignments" on public.daily_quest_assignments for select to authenticated using(user_id=auth.uid());
create policy "own observations" on public.observations for select to authenticated using(user_id=auth.uid());
create policy "own media" on public.observation_media for all to authenticated
using(user_id=auth.uid())
with check(user_id=auth.uid() and exists(select 1 from public.observations o where o.id=observation_id and o.user_id=auth.uid()));
create policy "own seeds" on public.memory_seeds for select to authenticated using(user_id=auth.uid());
create policy "own placements" on public.garden_placements for all to authenticated
using(user_id=auth.uid())
with check(
  user_id=auth.uid()
  and (seed_id is null or exists(select 1 from public.memory_seeds s where s.id=seed_id and s.user_id=auth.uid()))
  and (catalog_item_id is null or exists(select 1 from public.user_inventory i where i.item_id=catalog_item_id and i.user_id=auth.uid()))
);
create policy "own inventory" on public.user_inventory for select to authenticated using(user_id=auth.uid());
create policy "own ledger" on public.token_ledger for select to authenticated using(user_id=auth.uid());
create policy "own capsules" on public.capsules for select to authenticated using(user_id=auth.uid());
create policy "own capsule entries" on public.capsule_observations for select to authenticated using(exists(select 1 from public.capsules c where c.id=capsule_id and c.user_id=auth.uid()));
create policy "own preferences" on public.user_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('observation-media','observation-media',false,20971520,array['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/mpeg'])
on conflict(id) do nothing;

create policy "upload own observation media" on storage.objects for insert to authenticated
with check(bucket_id='observation-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "read own observation media" on storage.objects for select to authenticated
using(bucket_id='observation-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "delete own observation media" on storage.objects for delete to authenticated
using(bucket_id='observation-media' and (storage.foldername(name))[1]=auth.uid()::text);

grant execute on function public.get_daily_quest(date) to authenticated;
grant execute on function public.import_legacy_profile(text,text,text,integer,integer) to authenticated;
grant execute on function public.submit_observation(uuid,public.observation_source,text,text,text,text,uuid) to authenticated;
grant execute on function public.plant_seed(uuid) to authenticated;
grant execute on function public.harvest_seed(uuid) to authenticated;
grant execute on function public.purchase_item(text) to authenticated;
grant execute on function public.ensure_weekly_capsules() to authenticated;

revoke execute on function public.create_user_defaults() from public, anon, authenticated;
revoke execute on function public.get_daily_quest(date) from public, anon;
revoke execute on function public.import_legacy_profile(text,text,text,integer,integer) from public, anon;
revoke execute on function public.submit_observation(uuid,public.observation_source,text,text,text,text,uuid) from public, anon;
revoke execute on function public.plant_seed(uuid) from public, anon;
revoke execute on function public.harvest_seed(uuid) from public, anon;
revoke execute on function public.purchase_item(text) from public, anon;
revoke execute on function public.ensure_weekly_capsules() from public, anon;

revoke update on public.profiles from authenticated;
grant update(user_name,bean_name,timezone,onboarding_screen,tutorial_step,onboarding_completed_at,equipped_outfit,equipped_backdrop,updated_at) on public.profiles to authenticated;
