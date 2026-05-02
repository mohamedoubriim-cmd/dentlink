-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 007 : Dentist approval — status-kolumn + lab-admin godkännandeflöde
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Email-kolumn i profiles (visas i admin-portalen) ───────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- Backfill: kopiera email från auth.users för befintliga profiler
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email = '';

-- ── 2. Status-kolumn med check-constraint ─────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'rejected'));

-- Befintliga dentister som redan använder systemet sätts till 'active'
-- (de godkändes implicit genom att labbadmin skapade dem manuellt)
UPDATE profiles SET status = 'active' WHERE role = 'dentist';

-- ── 3. Uppdatera trigger: nya dentister → 'pending', övriga → 'active' ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'dentist'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'dentist') = 'dentist' THEN 'pending'
      ELSE 'active'
    END
  );
  RETURN NEW;
END;
$function$;

-- ── 4. ON DELETE-beteende på orders.dentist_user_id ──────────────────────────
--
-- Valt alternativ: ON DELETE SET NULL (alternativ b)
--
-- Motivering: ett laboratorium har affärsmässigt och eventuellt juridiskt
-- behov av att bevara orderhistoriken för fakturering och revision. Om
-- dentistens konto raderas vill vi inte att ordrarna försvinner med det.
-- Med SET NULL sätts dentist_user_id = NULL; UI:t kan visa "Dentiste supprimé"
-- där dentistnamnet normalt visas. Alternativ a (CASCADE) är ett sämre val
-- eftersom det tyst raderar fakturaunderlag — en operation som inte går att
-- ångra utan databasekopia.
--
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- Hitta det auto-genererade constraint-namnet dynamiskt
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t   ON c.conrelid  = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname  = 'orders'
    AND a.attname  = 'dentist_user_id'
    AND c.contype  = 'f';

  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_dentist_user_id_fkey
  FOREIGN KEY (dentist_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- ── 5. Uppdatera orders-policies: spärra pending- och rejected-dentister ──────

-- SELECT: kräver nu att dentistens status = 'active'
DROP POLICY IF EXISTS "Dentists read own orders" ON orders;
CREATE POLICY "Dentists read own orders" ON orders FOR SELECT TO authenticated
  USING (
    dentist_user_id = auth.uid()
    AND hidden_for_dentist = false
    AND (SELECT status FROM profiles WHERE id = auth.uid()) = 'active'
  );

-- INSERT: ny order kräver status = 'active'
DROP POLICY IF EXISTS "Dentists insert own orders" ON orders;
CREATE POLICY "Dentists insert own orders" ON orders FOR INSERT TO authenticated
  WITH CHECK (
    dentist_user_id = auth.uid()
    AND (SELECT status FROM profiles WHERE id = auth.uid()) = 'active'
  );

-- UPDATE (hidden_for_dentist): behåll logiken från 006 men lägg till status-check
DROP POLICY IF EXISTS "Dentists update own orders" ON orders;
CREATE POLICY "Dentists update own orders" ON orders FOR UPDATE TO authenticated
  USING (
    dentist_user_id = auth.uid()
    AND get_my_role() = 'dentist'
    AND (SELECT status FROM profiles WHERE id = auth.uid()) = 'active'
  )
  WITH CHECK (dentist_user_id = auth.uid());

-- ── 6. RLS: lab_admin får uppdatera status på dentist-profiler ───────────────
--
-- Notera: enforce_role_immutable-triggern (migration 005) blockerar ändringar
-- av kolumnen 'role' men låter 'status'-ändringar passera utan hinder.
-- Den befintliga profiles_update-policyn gäller bara (id = auth.uid()),
-- dvs. en users egna rad — inte andras. Den nya policyn nedan hanterar
-- att lab_admin uppdaterar en dentists rad.
--
DROP POLICY IF EXISTS "admin_update_dentist_status" ON profiles;

CREATE POLICY "admin_update_dentist_status"
ON profiles FOR UPDATE
TO authenticated
USING  (get_my_role() = 'lab_admin' AND role = 'dentist')
WITH CHECK (get_my_role() = 'lab_admin' AND role = 'dentist');
