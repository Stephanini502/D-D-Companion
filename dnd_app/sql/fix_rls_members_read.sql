-- =====================================================================
--  FIX RLS — visibilità quest/PNG/loot/XP/handout lato GIOCATORE
--  Problema: da giocatore le quest attive risultano 0, da master 1.
--  Causa: le policy "members_read" fanno una subquery su campaign_members
--         / campaigns che, sotto RLS, non risolve correttamente
--         l'appartenenza del giocatore alla campagna.
--  Soluzione: helper SECURITY DEFINER che bypassa la RLS nelle subquery,
--             usato da tutte le policy di lettura dei membri.
--
--  ➜ Esegui tutto questo blocco nel SQL Editor di Supabase.
-- =====================================================================

-- 1) Helper: l'utente corrente è master O membro della campagna?
create or replace function public.is_campaign_member(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from campaigns c
            where c.id = cid and c.master_id = auth.uid())
    or
    exists (select 1 from campaign_members m
            where m.campaign_id = cid and m.user_id = auth.uid());
$$;

grant execute on function public.is_campaign_member(uuid) to authenticated;

-- 2) Ricrea le policy di SELECT usando l'helper.
--    (DROP IF EXISTS così è idempotente e rieseguibile senza errori.)

-- campaign_quests
drop policy if exists members_read on public.campaign_quests;
create policy members_read on public.campaign_quests
  for select to authenticated
  using ( public.is_campaign_member(campaign_id) );

-- campaign_npcs
drop policy if exists members_read on public.campaign_npcs;
create policy members_read on public.campaign_npcs
  for select to authenticated
  using ( public.is_campaign_member(campaign_id) );

-- campaign_loot
drop policy if exists members_read on public.campaign_loot;
create policy members_read on public.campaign_loot
  for select to authenticated
  using ( public.is_campaign_member(campaign_id) );

-- campaign_xp_log
drop policy if exists members_read on public.campaign_xp_log;
create policy members_read on public.campaign_xp_log
  for select to authenticated
  using ( public.is_campaign_member(campaign_id) );

-- campaign_handouts
drop policy if exists members_read on public.campaign_handouts;
create policy members_read on public.campaign_handouts
  for select to authenticated
  using ( public.is_campaign_member(campaign_id) );

-- (opzionale) campaign_environment, se la reintroduci nel frontend
drop policy if exists members_read on public.campaign_environment;
create policy members_read on public.campaign_environment
  for select to authenticated
  using ( public.is_campaign_member(campaign_id) );

-- =====================================================================
--  DIAGNOSTICA (facoltativa) — lancia da loggato COME GIOCATORE
--  per verificare che l'appartenenza sia riconosciuta.
--  Sostituisci <CAMPAIGN_ID> con l'id reale della campagna.
-- =====================================================================
-- select auth.uid()                         as io;
-- select public.is_campaign_member('<CAMPAIGN_ID>') as sono_membro;   -- deve dare true
-- select count(*) from campaign_quests where campaign_id = '<CAMPAIGN_ID>';  -- ora > 0
