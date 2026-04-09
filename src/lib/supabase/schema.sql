-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Wardrobe items
create table wardrobe_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text,
  category text not null,
  subcategory text,
  colors text[] default '{}',
  style_tags text[] default '{}',
  brand text,
  description text,
  created_at timestamptz default now()
);

-- Wishlist items
create table wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_url text not null,
  source text default 'manual',
  image_url text,
  title text not null,
  price numeric(10,2),
  currency text default 'USD',
  style_tags text[] default '{}',
  colors text[] default '{}',
  category text,
  created_at timestamptz default now()
);

-- Style profiles
create table style_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  dominant_styles text[] default '{}',
  color_palette text[] default '{}',
  preferred_categories text[] default '{}',
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  updated_at timestamptz default now()
);

-- Recommendations
create table recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  reason text not null,
  outfits_unlocked integer default 0,
  category text,
  style_tags text[] default '{}',
  colors text[] default '{}',
  image_url text,
  deal_url text,
  deal_price numeric(10,2),
  deal_source text,
  score integer default 0,
  created_at timestamptz default now()
);

-- RLS
alter table wardrobe_items enable row level security;
alter table wishlist_items enable row level security;
alter table style_profiles enable row level security;
alter table recommendations enable row level security;

create policy "Users manage own wardrobe" on wardrobe_items for all using (auth.uid() = user_id);
create policy "Users manage own wishlist" on wishlist_items for all using (auth.uid() = user_id);
create policy "Users manage own profile" on style_profiles for all using (auth.uid() = user_id);
create policy "Users manage own recommendations" on recommendations for all using (auth.uid() = user_id);

-- Storage bucket for wardrobe photos
insert into storage.buckets (id, name, public) values ('wardrobe', 'wardrobe', true);
create policy "Users upload own wardrobe photos" on storage.objects for insert with check (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Wardrobe photos are public" on storage.objects for select using (bucket_id = 'wardrobe');
create policy "Users delete own wardrobe photos" on storage.objects for delete using (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1]);
