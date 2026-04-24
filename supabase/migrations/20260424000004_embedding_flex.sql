-- Widen cards.embedding to allow any dimension (free-tier models vary)
alter table public.cards drop column embedding;
alter table public.cards add column embedding vector;
alter table public.cards add column embedding_dim int;
create index idx_cards_embedding_dim on public.cards(embedding_dim);
