alter table public.cards
  add column approved boolean not null default false;

update public.cards c
set approved = true
from public.decks d
where d.id = c.deck_id
  and d.status = 'ready';

alter table public.decks
  add constraint decks_status_check
  check (status in ('ingesting', 'draft', 'ready', 'failed', 'archived'));

create index idx_cards_review_eligible
  on public.cards(user_id, deck_id, suspended, approved);

create or replace function public.mark_deck_ready_if_reviewed(p_deck_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count int;
begin
  update public.decks d
  set status = 'ready'
  where d.id = p_deck_id
    and d.user_id = auth.uid()
    and d.status = 'draft'
    and exists (
      select 1
      from public.cards c
      where c.deck_id = d.id
        and c.user_id = auth.uid()
        and c.suspended = false
    )
    and not exists (
      select 1
      from public.cards c
      where c.deck_id = d.id
        and c.user_id = auth.uid()
        and c.suspended = false
        and c.approved = false
    );

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.sync_deck_review_gate(p_deck_id uuid)
returns table (card_count int, status text)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  with counts as (
    select
      count(*)::int as total_count,
      count(*) filter (where not suspended)::int as reviewable_count,
      count(*) filter (where not suspended and approved)::int as approved_count,
      count(*) filter (where not suspended and not approved)::int as pending_count
    from public.cards
    where deck_id = p_deck_id
      and user_id = auth.uid()
  )
  update public.decks d
  set card_count = counts.total_count,
      status = case
        when d.status = 'ready' and (counts.reviewable_count = 0 or counts.pending_count > 0)
          then 'draft'
        else d.status
      end
  from counts
  where d.id = p_deck_id
    and d.user_id = auth.uid()
  returning d.card_count, d.status;
end;
$$;
