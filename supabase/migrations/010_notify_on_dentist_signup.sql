-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 010 : Notifiera lab_admin + lab_staff när ny dentist registrerar sig
-- ══════════════════════════════════════════════════════════════════════════════
-- Triggar AFTER INSERT på profiles. Körs som SECURITY DEFINER så att den kan
-- läsa alla profiler (lab_admin/lab_staff) utan att begränsas av RLS.

CREATE OR REPLACE FUNCTION public.notify_lab_on_dentist_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role = 'dentist' THEN
    INSERT INTO public.notifications (user_id, title, message, order_id)
    SELECT
      p.id,
      'Nouvelle inscription dentiste',
      'Dr. ' || COALESCE(NULLIF(NEW.full_name, ''), 'Nouveau dentiste') ||
        CASE WHEN COALESCE(NEW.clinic, '') <> ''
          THEN ' (' || NEW.clinic || ')'
          ELSE ''
        END ||
        ' attend votre approbation.',
      NULL
    FROM public.profiles p
    WHERE p.role IN ('lab_admin', 'lab_staff');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_lab_on_dentist_signup ON public.profiles;

CREATE TRIGGER trg_notify_lab_on_dentist_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lab_on_dentist_signup();
