-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- profiles (1-to-1 with auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  daily_goal_cards int not null default 20,
  fsrs_weights jsonb,
  subject_family text,           -- math | language | science | humanities | other
  level text,                    -- beginner | intermediate | advanced
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- decks
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject_family text not null default 'other',
  source_pdf_path text,
  source_pdf_hash text,
  status text not null default 'ingesting',  -- ingesting | ready | failed
  card_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_decks_user on public.decks(user_id);

-- ingest_jobs
create table public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  stage text not null default 'parsing',
  progress_pct int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index idx_ingest_jobs_deck on public.ingest_jobs(deck_id);

-- cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null default 'qa',           -- qa | cloze | image_occlusion
  front jsonb not null,
  back jsonb not null,
  source_chunk_id text,
  concept_tag text,
  embedding vector(1536),
  fsrs_state jsonb,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cards_deck on public.cards(deck_id);
create index idx_cards_user on public.cards(user_id);
create index idx_cards_due on public.cards((fsrs_state->>'due'));

-- interference_pairs
create table public.interference_pairs (
  card_a uuid not null references public.cards(id) on delete cascade,
  card_b uuid not null references public.cards(id) on delete cascade,
  discriminative_prompt text,
  similarity float,
  primary key (card_a, card_b),
  check (card_a < card_b)
);

-- reviews (append-only)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rated_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 4),
  elapsed_ms int,
  scheduled_days_before int,
  fsrs_state_before jsonb,
  fsrs_state_after jsonb
);
create index idx_reviews_user_time on public.reviews(user_id, rated_at desc);

-- sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cards_reviewed int not null default 0,
  mean_accuracy float,
  mean_response_ms int,
  break_prompted_at timestamptz
);

-- llm_calls (cost observability)
create table public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stage text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger decks_updated_at before update on public.decks
  for each row execute function public.set_updated_at();
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();
