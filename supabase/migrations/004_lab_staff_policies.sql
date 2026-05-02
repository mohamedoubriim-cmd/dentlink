-- ── Fix profiles check constraint to allow 'lab_staff' role ───────────────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('lab_admin', 'lab_staff', 'dentist'));

-- ── Orders: add lab_staff access ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Lab staff read orders"   ON orders;
DROP POLICY IF EXISTS "Lab staff update orders" ON orders;
DROP POLICY IF EXISTS "Lab staff insert orders" ON orders;

CREATE POLICY "Lab staff read orders" ON orders FOR SELECT TO authenticated
  USING (get_my_role() = 'lab_staff');

CREATE POLICY "Lab staff update orders" ON orders FOR UPDATE TO authenticated
  USING (get_my_role() = 'lab_staff');

CREATE POLICY "Lab staff insert orders" ON orders FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'lab_staff');

-- ── Dentists: add lab_staff access ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Lab staff manage dentists" ON dentists;

CREATE POLICY "Lab staff manage dentists" ON dentists FOR ALL TO authenticated
  USING (get_my_role() = 'lab_staff');

-- ── Invoices: add lab_staff access ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Lab staff manage invoices" ON invoices;

CREATE POLICY "Lab staff manage invoices" ON invoices FOR ALL TO authenticated
  USING (get_my_role() = 'lab_staff');

-- ── Patients: add lab_staff access ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Lab staff manage patients" ON patients;

CREATE POLICY "Lab staff manage patients" ON patients FOR ALL TO authenticated
  USING (get_my_role() = 'lab_staff');

-- ── Notifications: ensure correct policies exist ────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      text        NOT NULL DEFAULT '',
  message    text        NOT NULL DEFAULT '',
  order_id   uuid        REFERENCES orders(id) ON DELETE SET NULL,
  read       boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_notifications"    ON notifications;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

-- Each user sees only their own notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Anyone authenticated can insert a notification for any user_id
-- (needed so dentists can create notifications for lab users)
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
