alter table public.llm_calls
  add column provider text not null default 'unknown',
  add column error_class text,
  add column error_message text,
  add column deck_id uuid references public.decks(id) on delete set null,
  add column job_id uuid references public.ingest_jobs(id) on delete set null;

create index if not exists llm_calls_deck_id_created_at_idx
  on public.llm_calls(deck_id, created_at desc);

create index if not exists llm_calls_job_id_created_at_idx
  on public.llm_calls(job_id, created_at desc);
