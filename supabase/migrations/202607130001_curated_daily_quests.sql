alter table public.quest_prompts add column if not exists theme_id text references public.theme_catalog(id);
alter table public.quest_prompts add column if not exists optional_follow_up text;
alter table public.quest_prompts add column if not exists cooldown_days integer not null default 45 check (cooldown_days between 1 and 365);

update public.quest_prompts set theme_id = case category when 'Color' then 'beauty-color' when 'Sound' then 'sound-presence' when 'Light' then 'beauty-color' else 'calm-reflection' end where theme_id is null;

insert into public.quest_prompts(prompt,category,emoji,is_daily,is_bonus,sort_order,theme_id,optional_follow_up) values
('What living thing nearby feels quietly interesting today?','Nature','🌿',true,false,101,'nature','What is it doing, or what detail did you notice?'),
('What part of the sky, weather, or outdoors met you today?','Nature','🌿',true,false,102,'nature','What did it make you pause for?'),
('Where did you notice a color you wanted to look at twice?','Color','🎨',true,false,103,'beauty-color','What was around it, or how did it make you feel?'),
('What texture, shape, or little visual detail caught your eye?','Color','🎨',true,false,104,'beauty-color','What made it stand out?'),
('What in your space is helping you slow down right now?','Moment','☁️',true,false,105,'calm-reflection','What does that slower moment feel like?'),
('What quiet moment would you like to keep from today?','Moment','☁️',true,false,106,'calm-reflection','Where were you when it happened?'),
('What small effort are you glad you made today?','Moment','✨',true,false,107,'achievement-energy','What made it worth the effort?'),
('When did you feel a little more capable than yesterday?','Moment','✨',true,false,108,'achievement-energy','What helped you get there?'),
('Who made your day feel a little lighter, even indirectly?','Moment','💗',true,false,109,'relationships-care','What did they do that stayed with you?'),
('Where did you notice care or kindness today?','Moment','💗',true,false,110,'relationships-care','How did it change the moment?'),
('What sound tells you something about where you are right now?','Sound','🎵',true,false,111,'sound-presence','Where is it coming from, or how does it make you feel?'),
('What sound would Bean be curious to hear with you?','Sound','🎵',true,false,112,'sound-presence','What makes it special today?'),
('What familiar thing is making today feel like yours?','Moment','🫖',true,false,113,'comfort-routine','What tiny detail makes it comforting?'),
('What ordinary comfort are you grateful to have nearby?','Moment','🫖',true,false,114,'comfort-routine','What does it add to your day?'),
('What gave you a tiny unexpected lift today?','Moment','☀️',true,false,115,'joy-optimism','What happened just before you noticed it?'),
('What small thing made you smile, even for a second?','Moment','☀️',true,false,116,'joy-optimism','What made it feel good?'),
('What made you wonder “how does that work?” today?','Moment','🔎',true,false,117,'creativity-curiosity','What are you curious about now?'),
('What idea, image, or pattern would you like Bean to notice with you?','Moment','🔎',true,false,118,'creativity-curiosity','What drew you toward it?')
on conflict(prompt) do update set theme_id=excluded.theme_id,optional_follow_up=excluded.optional_follow_up,active=true;

create or replace function public.get_daily_quest(p_local_date date)
returns table(assignment_id uuid, quest_id uuid, prompt text, category text, emoji text, completed_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_quest uuid; v_last_theme text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select q.theme_id into v_last_theme from public.daily_quest_assignments a join public.quest_prompts q on q.id=a.quest_id where a.user_id=v_uid and a.local_date<p_local_date order by a.local_date desc limit 1;
  select q.id into v_quest from public.quest_prompts q
  where q.active and q.is_daily and (v_last_theme is null or q.theme_id is distinct from v_last_theme)
    and not exists (select 1 from public.daily_quest_assignments a where a.user_id=v_uid and a.quest_id=q.id and a.local_date >= p_local_date-q.cooldown_days)
  order by md5(v_uid::text||p_local_date::text||q.id::text) limit 1;
  if v_quest is null then select q.id into v_quest from public.quest_prompts q where q.active and q.is_daily and (v_last_theme is null or q.theme_id is distinct from v_last_theme) order by md5(v_uid::text||p_local_date::text||q.id::text) limit 1; end if;
  if v_quest is null then select q.id into v_quest from public.quest_prompts q where q.active and q.is_daily order by md5(v_uid::text||p_local_date::text||q.id::text) limit 1; end if;
  insert into public.daily_quest_assignments(user_id,local_date,quest_id) values(v_uid,p_local_date,v_quest) on conflict(user_id,local_date) do nothing;
  return query select a.id,q.id,q.prompt,q.category,q.emoji,a.completed_at from public.daily_quest_assignments a join public.quest_prompts q on q.id=a.quest_id where a.user_id=v_uid and a.local_date=p_local_date;
end; $$;
