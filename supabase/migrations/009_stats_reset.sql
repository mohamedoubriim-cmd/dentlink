-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 009 : stats_reset_at — manuell nollställning av dashboard-statistik
-- ══════════════════════════════════════════════════════════════════════════════
-- Sparas på lab_admin:s profilrad. NULL = aldrig nollställt.
-- Bara lab_admin kan uppdatera sitt eget stats_reset_at (täcks av
-- den befintliga profiles_update-policyn: USING id = auth.uid()).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stats_reset_at TIMESTAMPTZ;
