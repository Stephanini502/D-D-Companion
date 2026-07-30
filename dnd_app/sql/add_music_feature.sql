-- =====================================================================
--  FEATURE MUSICA / JUKEBOX (solo master, riproduzione locale)
--  Playlist per campagna con brani da YouTube o file caricati,
--  raggruppati per categoria.
--
--  ➜ Esegui tutto nel SQL Editor di Supabase.
-- =====================================================================

-- 1) Tabella brani
create table if not exists public.campaign_tracks (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title       text not null,
  category    text not null default 'Altro',
  source_type text not null check (source_type in ('youtube', 'file')),
  url         text not null,               -- URL YouTube oppure path nel bucket
  order_index int  default 0,
  created_at  timestamptz default now()
);

alter table public.campaign_tracks enable row level security;

-- Solo il MASTER della campagna legge/scrive i propri brani
drop policy if exists master_all on public.campaign_tracks;
create policy master_all on public.campaign_tracks
  for all to authenticated
  using      ( exists (select 1 from campaigns c
                       where c.id = campaign_id and c.master_id = auth.uid()) )
  with check ( exists (select 1 from campaigns c
                       where c.id = campaign_id and c.master_id = auth.uid()) );

-- 2) Bucket storage per i file audio
insert into storage.buckets (id, name, public)
values ('campaign-audio', 'campaign-audio', true)
on conflict (id) do nothing;

-- lettura pubblica dei file audio
drop policy if exists "campaign-audio read" on storage.objects;
create policy "campaign-audio read" on storage.objects
  for select to public
  using ( bucket_id = 'campaign-audio' );

-- upload autenticato
drop policy if exists "campaign-audio insert" on storage.objects;
create policy "campaign-audio insert" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'campaign-audio' );

-- delete autenticato
drop policy if exists "campaign-audio delete" on storage.objects;
create policy "campaign-audio delete" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'campaign-audio' );
