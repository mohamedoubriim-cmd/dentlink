-- ── Hjälpfunktion ──────────────────────────────────────────────────────────
-- Hämtar inloggad användares roll utan att trigga RLS-rekursion
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

-- ── Ta bort alla gamla policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Read all profiles"  ON profiles;
DROP POLICY IF EXISTS "Manage own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select"    ON profiles;
DROP POLICY IF EXISTS "profiles_update"    ON profiles;
DROP POLICY IF EXISTS "profiles_insert"    ON profiles;

-- ── Nya rena policies ───────────────────────────────────────────────────────

-- 1. Varje inloggad användare kan läsa sin egen profilrad
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. lab_admin och lab_staff kan läsa ALLA profiler (för att se läkarlistan m.m.)
CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
TO authenticated
USING (get_my_role() IN ('lab_admin', 'lab_staff'));

-- 3. Användare kan uppdatera sin egen profil (namn, telefon, klinik, avatar)
--    MEN kan inte ändra sin roll — rollen låses till det befintliga värdet
CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = get_my_role()
);

-- 4. Ny profilrad skapas automatiskt vid registrering
CREATE POLICY "profiles_insert"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
