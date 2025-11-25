create table if not exists "_keepalive" (
    id int primary key,
    last_ping timestamptz not null default now()
);

alter table "_keepalive" enable row level security;

-- Insert initial record if it doesn't exist
insert into "_keepalive" (id, last_ping)
values (1, now())
on conflict (id) do nothing;

-- Policy to allow service role full access (implicit, but good to be explicit if we ever wanted client access, which we don't, but RLS is enabled so we are safe)
-- No policies needed for anonymous/authenticated users as this is service-role only.
