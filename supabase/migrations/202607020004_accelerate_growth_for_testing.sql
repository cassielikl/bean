-- Testing-only hosted timing. Replace these with the production intervals before release.
create or replace function public.seed_sprout_interval()
returns interval language sql stable set search_path = '' as $$
  select interval '10 seconds';
$$;

create or replace function public.seed_bloom_interval()
returns interval language sql stable set search_path = '' as $$
  select interval '30 seconds';
$$;
