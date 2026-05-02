// Edge Function: delete-dentist
// Utför hard delete av ett dentist-konto via service_role-nyckeln.
// Anropas från klienten av lab_admin; service_role-nyckeln exponeras aldrig i klienten.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { dentist_user_id } = await req.json()
    if (!dentist_user_id) return json({ error: 'dentist_user_id requis' }, 400)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)

    // ── Verifiera att anroparen är inloggad och har rollen lab_admin ──────────
    // Supabase client med anroparens JWT → RLS körs som den användaren
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) return json({ error: 'Token invalide' }, 401)

    const { data: callerProfile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'lab_admin') {
      return json({ error: 'Accès réservé au lab_admin' }, 403)
    }

    // ── Verifiera att målet faktiskt är en dentist ────────────────────────────
    const { data: targetProfile } = await supabaseUser
      .from('profiles')
      .select('id, role')
      .eq('id', dentist_user_id)
      .eq('role', 'dentist')
      .single()

    if (!targetProfile) {
      return json({ error: 'Dentiste introuvable ou accès non autorisé' }, 404)
    }

    // ── Hard delete med service_role-nyckeln ──────────────────────────────────
    // SUPABASE_SERVICE_ROLE_KEY är fördefinierad i Edge Functions-miljön —
    // ingen manuell secrets-konfiguration krävs för den nyckeln.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(dentist_user_id)
    if (deleteErr) return json({ error: deleteErr.message }, 500)

    // profiles-raden raderas automatiskt via ON DELETE CASCADE (FK → auth.users)
    // orders.dentist_user_id sätts till NULL via ON DELETE SET NULL (migration 007)

    return json({ success: true })
  } catch (_err) {
    return json({ error: 'Erreur interne du serveur' }, 500)
  }
})
