create table if not exists public.stripe_webhook_audit (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  event_type text not null,
  stripe_customer_id text,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'received',
  error_message text,
  payload jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists stripe_webhook_audit_event_id_idx on public.stripe_webhook_audit(event_id);
create index if not exists stripe_webhook_audit_customer_idx on public.stripe_webhook_audit(stripe_customer_id);
create index if not exists stripe_webhook_audit_created_at_idx on public.stripe_webhook_audit(created_at);

alter table public.stripe_webhook_audit enable row level security;
