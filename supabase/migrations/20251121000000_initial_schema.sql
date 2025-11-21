-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (mirrors auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create snippet table
create table public.snippet (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  code text not null,
  language text not null,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create collection table
create table public.collection (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  snippets jsonb[] default '{}'::jsonb[], -- Storing IDs as JSON array based on usage
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create links table
create table public.links (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  url text,
  short_url text not null,
  snippet_id uuid,
  visits integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.snippet enable row level security;
alter table public.collection enable row level security;
alter table public.links enable row level security;

-- Policies

-- Profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Snippets
create policy "Users can view own snippets." on public.snippet for select using (auth.uid() = user_id);
create policy "Users can insert own snippets." on public.snippet for insert with check (auth.uid() = user_id);
create policy "Users can update own snippets." on public.snippet for update using (auth.uid() = user_id);
create policy "Users can delete own snippets." on public.snippet for delete using (auth.uid() = user_id);

-- Collections
create policy "Users can view own collections." on public.collection for select using (auth.uid() = user_id);
create policy "Users can insert own collections." on public.collection for insert with check (auth.uid() = user_id);
create policy "Users can update own collections." on public.collection for update using (auth.uid() = user_id);
create policy "Users can delete own collections." on public.collection for delete using (auth.uid() = user_id);

-- Links
create policy "Users can view own links." on public.links for select using (auth.uid() = user_id);
create policy "Users can insert own links." on public.links for insert with check (auth.uid() = user_id);
create policy "Users can update own links." on public.links for update using (auth.uid() = user_id);
create policy "Users can delete own links." on public.links for delete using (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, username, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'user_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
