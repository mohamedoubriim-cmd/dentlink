-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 008 : Signup-fält — phone, clinic, city vid dentist-registrering
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Lägg till city-kolumn (phone och clinic finns redan) ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';

-- ── 2. Uppdatera trigger: läs phone, clinic, city från signup-metadata ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, phone, clinic, city, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'dentist'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'clinic', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'dentist') = 'dentist' THEN 'pending'
      ELSE 'active'
    END
  );
  RETURN NEW;
END;
$function$;
