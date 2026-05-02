-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 011 : invoice_id i notifications + dentist-läsrättighet på invoices
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Lägg till invoice_id på notifications ──────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- ── 2. Tillåt dentister att läsa sina egna fakturor ───────────────────────────
-- Matchar via e-post: dentist-profil i auth.users ↔ dentists.email.
-- Krävs för att InvoicePrint-sidan och PortalInvoices ska fungera för dentister.
DROP POLICY IF EXISTS "dentists_read_own_invoices" ON public.invoices;

CREATE POLICY "dentists_read_own_invoices" ON public.invoices FOR SELECT TO authenticated
  USING (
    get_my_role() = 'dentist'
    AND EXISTS (
      SELECT 1
      FROM public.dentists d
      JOIN auth.users u ON lower(d.email) = lower(u.email)
      WHERE d.id = invoices.dentist_id
        AND u.id = auth.uid()
    )
  );
