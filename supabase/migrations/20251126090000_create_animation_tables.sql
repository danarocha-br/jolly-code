-- Create animation table
create table if not exists public.animation (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  slides jsonb not null,
  settings jsonb not null,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create animation_collection table
create table if not exists public.animation_collection (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  animations jsonb[] default '{}'::jsonb[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.animation enable row level security;
alter table public.animation_collection enable row level security;

-- RLS Policies for animations
create policy "Users can view own animations." on public.animation
  for select using (auth.uid() = user_id);

create policy "Users can insert own animations." on public.animation
  for insert with check (auth.uid() = user_id);

create policy "Users can update own animations." on public.animation
  for update using (auth.uid() = user_id);

create policy "Users can delete own animations." on public.animation
  for delete using (auth.uid() = user_id);

-- RLS Policies for animation collections
create policy "Users can view own animation collections." on public.animation_collection
  for select using (auth.uid() = user_id);

create policy "Users can insert own animation collections." on public.animation_collection
  for insert with check (auth.uid() = user_id);

create policy "Users can update own animation collections." on public.animation_collection
  for update using (auth.uid() = user_id);

create policy "Users can delete own animation collections." on public.animation_collection
  for delete using (auth.uid() = user_id);

-- Add indexes for performance
create index if not exists animation_user_id_idx on public.animation(user_id);
create index if not exists animation_collection_user_id_idx on public.animation_collection(user_id);
