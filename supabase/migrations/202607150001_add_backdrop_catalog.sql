-- Purchaseable backdrop assets supplied for Bean's Store and Pod.
insert into public.catalog_items (id, name, emoji, category, price, sort_order) values
  ('backdrop-1', 'Golden Meadow', '', 'backdrop', 10, 101),
  ('backdrop-2', 'Lavender Evening', '', 'backdrop', 10, 102),
  ('backdrop-3', 'Moonlit Garden', '', 'backdrop', 10, 103),
  ('backdrop-4', 'Bluebell Day', '', 'backdrop', 15, 104),
  ('backdrop-5', 'Wildflower Field', '', 'backdrop', 10, 105),
  ('backdrop-6', 'Sunrise Hills', '', 'backdrop', 15, 106),
  ('backdrop-7', 'Garden Picnic', '', 'backdrop', 10, 107),
  ('backdrop-8', 'Dewdrop Morning', '', 'backdrop', 10, 108),
  ('backdrop-9', 'Dreamy Pond', '', 'backdrop', 15, 109),
  ('backdrop-10', 'Secret Grove', '', 'backdrop', 10, 110),
  ('backdrop-11', 'Blooming Path', '', 'backdrop', 15, 111),
  ('backdrop-12', 'Cloud Garden', '', 'backdrop', 10, 112),
  ('backdrop-13', 'Twilight Field', '', 'backdrop', 15, 113)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  sort_order = excluded.sort_order,
  active = true;
