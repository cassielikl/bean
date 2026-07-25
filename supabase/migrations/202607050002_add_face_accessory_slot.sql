alter table public.profiles
  add column if not exists equipped_face text not null default 'none';

grant update(equipped_face) on public.profiles to authenticated;
