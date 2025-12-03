alter table links
add column if not exists title text;

alter table links
add column if not exists description text;
