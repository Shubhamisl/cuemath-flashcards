alter table public.decks
  add column if not exists tags text[] not null default '{}';

update public.decks
set tags = '{}'
where tags is null;
