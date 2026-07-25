-- Production timing and Bean's versioned intelligence model.
create or replace function public.seed_sprout_interval()
returns interval language sql stable set search_path = '' as $$ select interval '2 hours' $$;

create or replace function public.seed_bloom_interval()
returns interval language sql stable set search_path = '' as $$ select interval '5 hours' $$;

create table public.flower_species (
  id text primary key,
  name text not null unique,
  asset_key text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.theme_catalog (
  id text primary key,
  name text not null unique,
  description text not null,
  active boolean not null default true,
  taxonomy_version integer not null default 1
);

create table public.theme_flower_mapping (
  theme_id text primary key references public.theme_catalog(id),
  flower_species_id text not null references public.flower_species(id),
  taxonomy_version integer not null default 1
);

create table public.classification_examples (
  id bigint generated always as identity primary key,
  theme_id text not null references public.theme_catalog(id),
  example_text text not null,
  secondary_tags text[] not null default '{}',
  taxonomy_version integer not null default 1,
  unique(theme_id, example_text)
);

create table public.observation_classifications (
  observation_id uuid primary key references public.observations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary_theme_id text not null references public.theme_catalog(id),
  flower_species_id text not null references public.flower_species(id),
  secondary_tags text[] not null default '{}',
  sensory_channel text not null default 'general' check (sensory_channel in ('visual','sound','touch','smell','taste','movement','general')),
  tone text not null default 'positive' check (tone in ('positive','neutral')),
  confidence double precision not null check (confidence between 0 and 1),
  provenance text not null check (provenance in ('prompt_rule','keyword_fallback','ai','user_corrected')),
  model_version text not null,
  classified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classification_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null references public.observations(id) on delete cascade,
  previous_theme_id text not null references public.theme_catalog(id),
  corrected_theme_id text not null references public.theme_catalog(id),
  created_at timestamptz not null default now()
);

create table public.user_interest_signals (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  confidence double precision not null default 0 check (confidence between 0 and 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key(user_id, tag)
);

create table public.bean_personality_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  practical_adventurous double precision not null default 0 check (practical_adventurous between -100 and 100),
  spontaneous_organized double precision not null default 0 check (spontaneous_organized between -100 and 100),
  reserved_social double precision not null default 0 check (reserved_social between -100 and 100),
  competitive_cooperative double precision not null default 0 check (competitive_cooperative between -100 and 100),
  calm_passionate double precision not null default 0 check (calm_passionate between -100 and 100),
  updated_at timestamptz not null default now()
);

create table public.bean_personality_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  idempotency_key text not null,
  deltas jsonb not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table public.bean_mood_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mood text not null default 'content' check (mood in ('content','curious','excited','proud','gentle','sleepy')),
  reason text not null default 'Bean is happy to be here.',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.derived_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('exam','deadline','appointment','birthday','travel','important','activity_trend','sleep_trend','mindful_trend')),
  band text check (band is null or band in ('below_usual','usual','above_usual')),
  starts_at timestamptz,
  expires_at timestamptz not null,
  user_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.device_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios')),
  apns_token text not null,
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, apns_token)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_prompt_enabled boolean not null default false,
  bloom_enabled boolean not null default false,
  calendar_encouragement_enabled boolean not null default false,
  daily_window_start time not null default '18:00',
  daily_window_end time not null default '20:00',
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '08:00',
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.device_installations(id) on delete set null,
  kind text not null check (kind in ('daily_prompt','bloom','calendar_encouragement','health_gentle')),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','opened','dismissed')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  opened_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

insert into public.flower_species(id,name,asset_key,sort_order) values
('daisy','Daisy','daisy',1),('tulip','Tulip','tulip',2),('morning-glory','Morning Glory','morning-glory',3),
('marigold','Marigold','marigold',4),('peony','Peony','peony',5),('bluebell','Bluebell','bluebell',6),
('lavender','Lavender','lavender',7),('sunflower','Sunflower','sunflower',8),('iris','Iris','iris',9);

insert into public.theme_catalog(id,name,description) values
('nature','Nature','Plants, animals, weather, and the outdoors.'),
('beauty-color','Beauty and color','Color, light, texture, and visual beauty.'),
('calm-reflection','Calm and reflection','Quiet, stillness, gratitude, and reflection.'),
('achievement-energy','Achievement and energy','Progress, effort, accomplishment, and movement.'),
('relationships-care','Relationships and care','Family, friends, kindness, and connection.'),
('sound-presence','Sound and presence','Music, voices, ambient sound, and listening.'),
('comfort-routine','Comfort and routine','Home, food, familiar places, and rituals.'),
('joy-optimism','Joy and optimism','Delight, humor, celebration, and hope.'),
('creativity-curiosity','Creativity and curiosity','Art, ideas, learning, and discovery.');

insert into public.theme_flower_mapping(theme_id,flower_species_id) values
('nature','daisy'),('beauty-color','tulip'),('calm-reflection','morning-glory'),
('achievement-energy','marigold'),('relationships-care','peony'),('sound-presence','bluebell'),
('comfort-routine','lavender'),('joy-optimism','sunflower'),('creativity-curiosity','iris');

-- Five authored examples crossed with five neutral contexts yields 25 stable
-- evaluation rows per theme while keeping the seed migration reviewable.
with examples(theme_id, samples) as (values
 ('nature', array['sunlight through the leaves','a bird outside my window','the smell after rain','tiny flowers beside the path','clouds moving across the sky']),
 ('beauty-color', array['a bright blue cup caught my eye','pink light on the wall','the soft texture of this blanket','gold reflections in a puddle','the colors of fruit on the table']),
 ('calm-reflection', array['a quiet minute before work','sitting still with my tea','I felt grateful for the silence','taking one slow breath','watching the evening settle']),
 ('achievement-energy', array['I finished a difficult task','my walk made me feel energized','I kept going when it was hard','I learned a new exercise','I made progress on my project']),
 ('relationships-care', array['my friend checked in on me','dinner with my family','someone held the door for me','my pet stayed close today','I sent a kind message']),
 ('sound-presence', array['rain tapping on the window','a song made me pause','I heard children laughing','the hum of the train','birds singing in the morning']),
 ('comfort-routine', array['my familiar morning coffee','coming home to my room','a warm bowl of soup','putting on my favorite sweater','my usual walk around the block']),
 ('joy-optimism', array['a joke made me laugh','I am excited for tomorrow','a small surprise delighted me','we celebrated good news','the sunshine lifted my mood']),
 ('creativity-curiosity', array['I sketched an idea','I learned a surprising fact','I tried a new recipe','I wondered how this works','I noticed an interesting pattern'])
), contexts(prefix) as (values ('Today I noticed '),('A small good thing was '),('I appreciated '),('Bean should remember '),('In my world there was '))
insert into public.classification_examples(theme_id,example_text)
select theme_id, prefix || sample from examples cross join lateral unnest(samples) sample cross join contexts;

alter table public.observation_classifications enable row level security;
alter table public.classification_feedback enable row level security;
alter table public.user_interest_signals enable row level security;
alter table public.bean_personality_state enable row level security;
alter table public.bean_personality_events enable row level security;
alter table public.bean_mood_state enable row level security;
alter table public.derived_contexts enable row level security;
alter table public.device_installations enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.theme_catalog enable row level security;
alter table public.flower_species enable row level security;
alter table public.theme_flower_mapping enable row level security;
alter table public.classification_examples enable row level security;

create policy "read taxonomy" on public.theme_catalog for select to authenticated using(active);
create policy "read flowers" on public.flower_species for select to authenticated using(active);
create policy "read theme flower mapping" on public.theme_flower_mapping for select to authenticated using(true);
create policy "own classifications" on public.observation_classifications for select to authenticated using(user_id=auth.uid());
create policy "own feedback" on public.classification_feedback for select to authenticated using(user_id=auth.uid());
create policy "own interests" on public.user_interest_signals for select to authenticated using(user_id=auth.uid());
create policy "own personality" on public.bean_personality_state for select to authenticated using(user_id=auth.uid());
create policy "own personality events" on public.bean_personality_events for select to authenticated using(user_id=auth.uid());
create policy "own mood" on public.bean_mood_state for select to authenticated using(user_id=auth.uid());
create policy "own contexts" on public.derived_contexts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own devices" on public.device_installations for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own notification preferences" on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own notification deliveries" on public.notification_deliveries for select to authenticated using(user_id=auth.uid());

create or replace function public.create_intelligence_defaults()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.bean_personality_state(user_id) values(new.id) on conflict do nothing;
  insert into public.bean_mood_state(user_id) values(new.id) on conflict do nothing;
  insert into public.notification_preferences(user_id,timezone)
  values(new.id,coalesce(new.timezone,'UTC')) on conflict do nothing;
  return new;
end; $$;
create trigger on_profile_intelligence_defaults after insert on public.profiles
for each row execute procedure public.create_intelligence_defaults();

insert into public.bean_personality_state(user_id) select id from public.profiles on conflict do nothing;
insert into public.bean_mood_state(user_id) select id from public.profiles on conflict do nothing;
insert into public.notification_preferences(user_id,timezone) select id,timezone from public.profiles on conflict do nothing;

create or replace function public.apply_observation_classification(
  p_observation_id uuid, p_primary_theme_id text, p_secondary_tags text[],
  p_sensory_channel text, p_tone text, p_confidence double precision,
  p_provenance text, p_model_version text
) returns table(primary_theme_id text, flower_species_id text)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid := auth.uid(); v_flower text; v_tag text;
begin
  if not exists(select 1 from public.observations where id=p_observation_id and user_id=v_uid) then raise exception 'observation not found'; end if;
  select m.flower_species_id into v_flower from public.theme_flower_mapping m where m.theme_id=p_primary_theme_id;
  if v_flower is null then raise exception 'unknown theme'; end if;
  insert into public.observation_classifications(observation_id,user_id,primary_theme_id,flower_species_id,secondary_tags,sensory_channel,tone,confidence,provenance,model_version)
  values(p_observation_id,v_uid,p_primary_theme_id,v_flower,coalesce(p_secondary_tags,'{}'),p_sensory_channel,p_tone,p_confidence,p_provenance,p_model_version)
  on conflict(observation_id) do update set primary_theme_id=excluded.primary_theme_id,
    flower_species_id=case when exists(select 1 from public.memory_seeds s where s.observation_id=p_observation_id and s.planted_at is not null)
      then observation_classifications.flower_species_id else excluded.flower_species_id end,
    secondary_tags=excluded.secondary_tags,sensory_channel=excluded.sensory_channel,tone=excluded.tone,
    confidence=excluded.confidence,provenance=excluded.provenance,model_version=excluded.model_version,updated_at=now();
  foreach v_tag in array coalesce(p_secondary_tags,'{}') loop
    insert into public.user_interest_signals(user_id,tag,evidence_count,confidence)
    values(v_uid,v_tag,1,1.0/3.0)
    on conflict(user_id,tag) do update set evidence_count=user_interest_signals.evidence_count+1,
      confidence=least(1,(user_interest_signals.evidence_count+1)/3.0),last_seen_at=now();
  end loop;
  return query select p_primary_theme_id,v_flower;
end; $$;

create or replace function public.correct_observation_theme(p_observation_id uuid,p_theme_id text)
returns table(primary_theme_id text,flower_species_id text)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_previous text;
begin
  select c.primary_theme_id into v_previous from public.observation_classifications c where c.observation_id=p_observation_id and c.user_id=v_uid;
  if v_previous is null then raise exception 'classification not found'; end if;
  insert into public.classification_feedback(user_id,observation_id,previous_theme_id,corrected_theme_id) values(v_uid,p_observation_id,v_previous,p_theme_id);
  return query select * from public.apply_observation_classification(p_observation_id,p_theme_id,
    (select secondary_tags from public.observation_classifications where observation_id=p_observation_id),
    (select sensory_channel from public.observation_classifications where observation_id=p_observation_id),
    (select tone from public.observation_classifications where observation_id=p_observation_id),1,'user_corrected','user-v1');
end; $$;

create or replace function public.record_bean_behavior(p_event_type text,p_idempotency_key text)
returns public.bean_personality_state language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); d_pa float:=0; d_so float:=0; d_rs float:=0; d_cc float:=0; d_cp float:=0; v_explanation text;
  u_pa float:=0; u_so float:=0; u_rs float:=0; u_cc float:=0; u_cp float:=0;
begin
  case p_event_type
    when 'daily_completed' then d_so:=0.25; d_pa:=-0.1; v_explanation:='Bean learned from a steady daily visit.';
    when 'bonus_completed' then d_pa:=0.25; d_cp:=0.15; v_explanation:='Bean explored an extra prompt.';
    when 'freeform_shared' then d_so:=-0.25; d_pa:=0.15; v_explanation:='Bean received a spontaneous noticing.';
    when 'garden_designed' then d_pa:=-0.2; v_explanation:='Bean practiced arranging its garden.';
    when 'item_purchased' then d_cp:=0.1; v_explanation:='Bean tried something expressive.';
    else raise exception 'unknown behavior event';
  end case;
  select coalesce(sum(abs((deltas->>'practical_adventurous')::float)),0),
    coalesce(sum(abs((deltas->>'spontaneous_organized')::float)),0),
    coalesce(sum(abs((deltas->>'reserved_social')::float)),0),
    coalesce(sum(abs((deltas->>'competitive_cooperative')::float)),0),
    coalesce(sum(abs((deltas->>'calm_passionate')::float)),0)
  into u_pa,u_so,u_rs,u_cc,u_cp from public.bean_personality_events
  where user_id=v_uid and created_at>=date_trunc('day',now());
  d_pa:=sign(d_pa)*least(abs(d_pa),greatest(0,2-u_pa)); d_so:=sign(d_so)*least(abs(d_so),greatest(0,2-u_so));
  d_rs:=sign(d_rs)*least(abs(d_rs),greatest(0,2-u_rs)); d_cc:=sign(d_cc)*least(abs(d_cc),greatest(0,2-u_cc));
  d_cp:=sign(d_cp)*least(abs(d_cp),greatest(0,2-u_cp));
  insert into public.bean_personality_events(user_id,event_type,idempotency_key,deltas,explanation)
  values(v_uid,p_event_type,p_idempotency_key,jsonb_build_object('practical_adventurous',d_pa,'spontaneous_organized',d_so,'reserved_social',d_rs,'competitive_cooperative',d_cc,'calm_passionate',d_cp),v_explanation)
  on conflict(user_id,idempotency_key) do nothing;
  if not found then return (select s from public.bean_personality_state s where user_id=v_uid); end if;
  update public.bean_personality_state set
    practical_adventurous=greatest(-100,least(100,practical_adventurous+d_pa)),
    spontaneous_organized=greatest(-100,least(100,spontaneous_organized+d_so)),
    reserved_social=greatest(-100,least(100,reserved_social+d_rs)),
    competitive_cooperative=greatest(-100,least(100,competitive_cooperative+d_cc)),
    calm_passionate=greatest(-100,least(100,calm_passionate+d_cp)),updated_at=now() where user_id=v_uid;
  update public.bean_mood_state set mood=case p_event_type when 'daily_completed' then 'proud' when 'bonus_completed' then 'excited' when 'freeform_shared' then 'curious' else 'content' end,
    reason=v_explanation,expires_at=now()+interval '2 hours',updated_at=now() where user_id=v_uid;
  return (select s from public.bean_personality_state s where user_id=v_uid);
end; $$;

grant execute on function public.apply_observation_classification(uuid,text,text[],text,text,double precision,text,text) to authenticated;
grant execute on function public.correct_observation_theme(uuid,text) to authenticated;
grant execute on function public.record_bean_behavior(text,text) to authenticated;
revoke execute on function public.apply_observation_classification(uuid,text,text[],text,text,double precision,text,text) from public,anon;
revoke execute on function public.correct_observation_theme(uuid,text) from public,anon;
revoke execute on function public.record_bean_behavior(text,text) from public,anon;

insert into public.catalog_items(id, name, emoji, category, price, sort_order)
values ('bean-character', 'Bean', '🫘', 'garden', 0, 0)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, category=excluded.category,
  price=excluded.price, sort_order=excluded.sort_order, active=true;

-- Keep newly-created accounts aligned with the current UI: Bean is available as
-- placeable garden decor, but the old mushroom/lamp is no longer a starter item.
create or replace function public.create_user_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict do nothing;
  insert into public.user_inventory(user_id, item_id)
  select new.id, id from public.catalog_items where id in ('hat', 'meadow', 'bean-character')
  on conflict do nothing;
  return new;
end; $$;

-- The in-app "restart onboarding" button is intentionally broad for testing:
-- it clears MVP progress plus the newer intelligence/native-context records,
-- then restores the same clean starter state a new user receives.
create or replace function public.reset_own_progress()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  delete from public.notification_deliveries where user_id = v_uid;
  delete from public.device_installations where user_id = v_uid;
  delete from public.derived_contexts where user_id = v_uid;
  delete from public.bean_personality_events where user_id = v_uid;
  delete from public.classification_feedback where user_id = v_uid;
  delete from public.user_interest_signals where user_id = v_uid;
  delete from public.observation_classifications where user_id = v_uid;
  delete from public.capsules where user_id = v_uid;
  delete from public.garden_placements where user_id = v_uid;
  delete from public.token_ledger where user_id = v_uid;
  delete from public.observations where user_id = v_uid;
  delete from public.daily_quest_assignments where user_id = v_uid;
  delete from public.user_inventory where user_id = v_uid;

  insert into public.user_inventory(user_id, item_id)
  select v_uid, id from public.catalog_items where id in ('hat', 'meadow', 'bean-character')
  on conflict do nothing;

  update public.profiles set user_name='', bean_name='', timezone='UTC', onboarding_screen='o1', tutorial_step=0,
    onboarding_completed_at=null, local_data_imported_at=null, tokens=10, equipped_outfit='none',
    equipped_face='none', equipped_backdrop='meadow', updated_at=now()
  where id=v_uid;
  update public.user_preferences set calendar_enabled=false, health_enabled=false, notifications_enabled=false, updated_at=now()
  where user_id=v_uid;
  insert into public.bean_personality_state(user_id) values(v_uid) on conflict(user_id) do update set
    practical_adventurous=0, spontaneous_organized=0, reserved_social=0,
    competitive_cooperative=0, calm_passionate=0, updated_at=now();
  insert into public.bean_mood_state(user_id) values(v_uid) on conflict(user_id) do update set
    mood='content', reason='Bean is happy to be here.', expires_at=null, updated_at=now();
  insert into public.notification_preferences(user_id, timezone) values(v_uid, 'UTC') on conflict(user_id) do update set
    daily_prompt_enabled=false, bloom_enabled=false, calendar_encouragement_enabled=false,
    daily_window_start='18:00', daily_window_end='20:00', quiet_hours_start='21:00',
    quiet_hours_end='08:00', timezone='UTC', updated_at=now();
end; $$;

revoke execute on function public.reset_own_progress() from public, anon;
grant execute on function public.reset_own_progress() to authenticated;
