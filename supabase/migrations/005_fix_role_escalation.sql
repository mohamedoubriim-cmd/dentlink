-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 005 : Bloquer l'escalade de rôle dans la table profiles
-- ══════════════════════════════════════════════════════════════════════════════
-- Problème :
--   La policy "Manage own profile" (002) autorise tout UPDATE sur sa propre
--   ligne sans restriction sur la colonne `role`. Un dentiste pourrait écrire :
--     UPDATE profiles SET role = 'lab_admin' WHERE id = auth.uid();
--   La WITH CHECK de la migration 003 devrait bloquer cela, mais dépend du
--   comportement du snapshot MVCC lors de l'évaluation. On ajoute ici deux
--   couches de défense indépendantes.
--
-- Solution (deux couches) :
--   1. RLS policy profiles_update — WITH CHECK garantit que role ne change pas.
--   2. Trigger BEFORE UPDATE — compare explicitement OLD.role et NEW.role,
--      sans ambiguïté de snapshot. Seuls postgres/service_role peuvent changer
--      le rôle (pour les scripts d'onboarding via le Dashboard SQL Editor).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Helper : retourne le rôle actuel de l'utilisateur connecté ─────────────
--    (recréé ici au cas où la migration 003 n'aurait pas été exécutée)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

-- ── 2. Nettoyage des anciennes policies trop permissives ──────────────────────
DROP POLICY IF EXISTS "Manage own profile"  ON profiles;  -- 002 : pas de vérification de rôle
DROP POLICY IF EXISTS "profiles_update"     ON profiles;  -- 003 : recréée ci-dessous proprement

-- ── 3. Policy UPDATE correcte : l'utilisateur modifie sa propre ligne,
--       mais le champ role doit rester identique à la valeur actuelle ──────────
CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
TO authenticated
USING  (id = auth.uid())
WITH CHECK (
  id   = auth.uid()
  AND role = get_my_role()  -- NEW.role doit être identique à OLD.role
);

-- ── 4. Trigger BEFORE UPDATE : deuxième couche, indépendante du RLS ───────────
--    Bloque tout changement de rôle venant de l'API (current_user = 'authenticated').
--    Les opérations via Dashboard SQL Editor (current_user = 'postgres') ou
--    via service_role restent possibles → nécessaire pour l'onboarding manuel.
CREATE OR REPLACE FUNCTION enforce_role_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user = 'authenticated'
  THEN
    RAISE EXCEPTION
      'Modification du rôle non autorisée — contactez l''administrateur (ROLE_IMMUTABLE)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_role_immutable ON profiles;
CREATE TRIGGER trg_role_immutable
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_role_immutable();
