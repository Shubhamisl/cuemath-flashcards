-- Enable RLS on all user-scoped tables
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.ingest_jobs enable row level security;
alter table public.cards enable row level security;
alter table public.interference_pairs enable row level security;
alter table public.reviews enable row level security;
alter table public.sessions enable row level security;
alter table public.llm_calls enable row level security;

-- profiles: user can read/write their own row
create policy "own_profile_select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own_profile_insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "own_profile_update" on public.profiles
  for update using (auth.uid() = user_id);

-- decks
create policy "own_decks_all" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ingest_jobs: via deck ownership
create policy "own_ingest_jobs_all" on public.ingest_jobs
  for all using (
    exists (select 1 from public.decks d where d.id = ingest_jobs.deck_id and d.user_id = auth.uid())
  );

-- cards
create policy "own_cards_all" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- interference_pairs: via card_a ownership
create policy "own_interference_all" on public.interference_pairs
  for all using (
    exists (select 1 from public.cards c where c.id = interference_pairs.card_a and c.user_id = auth.uid())
  );

-- reviews
create policy "own_reviews_all" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions
create policy "own_sessions_all" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- llm_calls: read-only for user (service role writes)
create policy "own_llm_calls_select" on public.llm_calls
  for select using (auth.uid() = user_id);
