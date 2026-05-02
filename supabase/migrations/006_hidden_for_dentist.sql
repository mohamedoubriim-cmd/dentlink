-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 006 : hidden_for_dentist — masquer une commande côté dentiste
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS hidden_for_dentist boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Dentists read own orders" ON orders;
CREATE POLICY "Dentists read own orders" ON orders FOR SELECT TO authenticated
  USING (dentist_user_id = auth.uid() AND hidden_for_dentist = false);

DROP POLICY IF EXISTS "Dentists update own orders" ON orders;
CREATE POLICY "Dentists update own orders" ON orders FOR UPDATE TO authenticated
  USING  (dentist_user_id = auth.uid() AND get_my_role() = 'dentist')
  WITH CHECK (dentist_user_id = auth.uid());

-- Trigger : les dentistes ne peuvent modifier que hidden_for_dentist
CREATE OR REPLACE FUNCTION guard_dentist_order_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hidden boolean;
BEGIN
  IF current_user = 'authenticated' AND get_my_role() = 'dentist' THEN
    v_hidden := NEW.hidden_for_dentist;
    NEW      := OLD;
    NEW.hidden_for_dentist := v_hidden;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dentist_order_update ON orders;
CREATE TRIGGER trg_guard_dentist_order_update
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION guard_dentist_order_update();
