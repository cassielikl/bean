insert into public.catalog_items (id, name, emoji, category, price, sort_order)
values
  ('crown', 'Crown', '👑', 'outfit', 5, 2),
  ('bow', 'Blue Bow', '🎀', 'outfit', 4, 3),
  ('mustache', 'Mustache', '〰', 'outfit', 2, 4),
  ('blush', 'Blush', '〰', 'outfit', 2, 5),
  ('heartGlasses', 'Heart Glasses', '♡—♡', 'outfit', 3, 6),
  ('catEars', 'Cat Ears', '◢ ◣', 'outfit', 3, 7),
  ('bearEars', 'Bear Ears', '◖ ◗', 'outfit', 3, 8),
  ('bunnyEars', 'Bunny Ears', 'ᘏ ᘏ', 'outfit', 3, 9),
  ('flowerClip', 'Flower Clip', '🌸', 'outfit', 2, 10),
  ('mushroomHouse', 'Mushroom House', '🍄', 'garden', 5, 20),
  ('stump', 'Tree Stump', '🪵', 'garden', 4, 21),
  ('snail', 'Garden Snail', '🐌', 'garden', 2, 22),
  ('fence', 'Wooden Fence', '╫╫╫', 'garden', 2, 23),
  ('gnome', 'Garden Gnome', '🧙', 'garden', 3, 24),
  ('bird', 'Little Bird', '🐦', 'garden', 3, 25),
  ('bush', 'Flowering Bush', '🌿', 'garden', 3, 26),
  ('wateringCan', 'Watering Can', '🪣', 'garden', 3, 27)
on conflict (id) do update set
  name = excluded.name,
  emoji = excluded.emoji,
  category = excluded.category,
  price = excluded.price,
  sort_order = excluded.sort_order,
  active = true;

update public.catalog_items
set name = 'Top Hat', price = 5, sort_order = 1
where id = 'hat';
