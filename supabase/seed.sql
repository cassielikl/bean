-- Accelerated growth is only enabled in the local Supabase database.
alter database postgres set app.bean_growth_mode = 'development';
