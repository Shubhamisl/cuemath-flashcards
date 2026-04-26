alter table public.reviews
  add column if not exists hint_used boolean not null default false;

alter table public.sessions
  add column if not exists mode text not null default 'standard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_mode_check'
  ) then
    alter table public.sessions
      add constraint sessions_mode_check
      check (mode in ('standard', 'quick'));
  end if;
end $$;
