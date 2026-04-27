alter table public.profiles
  add column if not exists daily_new_cards_limit integer;

update public.profiles
set daily_new_cards_limit = greatest(1, least(coalesce(daily_goal_cards, 20), 10))
where daily_new_cards_limit is null;

alter table public.profiles
  alter column daily_new_cards_limit set default 10;

alter table public.profiles
  alter column daily_new_cards_limit set not null;

alter table public.profiles
  drop constraint if exists profiles_daily_new_cards_limit_check;

alter table public.profiles
  add constraint profiles_daily_new_cards_limit_check
  check (daily_new_cards_limit between 1 and 20);
