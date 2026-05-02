Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const order = body.record

    if (!order) {
      return new Response('No record', { status: 400 })
    }

    const phone   = Deno.env.get('CALLMEBOT_PHONE')
    const apiKey  = Deno.env.get('CALLMEBOT_APIKEY')
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!phone || !apiKey) {
      return new Response('Missing env vars', { status: 500 })
    }

    // Hämta läkarens namn
    let dentistName = 'Inconnu'
    if (order.dentist_id && supabaseUrl && supabaseKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/dentists?id=eq.${order.dentist_id}&select=name`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })
      const data = await res.json()
      if (data?.[0]?.name) dentistName = data[0].name
    }

    const workTypes: Record<string, string> = {
      crown:        'Couronne',
      bridge:       'Bridge',
      implant:      'Implant',
      denture:      'Prothèse',
      veneer:       'Facette',
      retainer:     'Contention',
      night_guard:  'Gouttière',
      other:        'Autre',
    }
    const workLabel = workTypes[order.work_type] ?? order.work_type

    const message = `🦷 Nouvelle commande!\n\nN°: ${order.order_number}\nPatient: ${order.patient_name}\nMédecin: ${dentistName}\nType: ${workLabel}\nDate limite: ${order.due_date}`

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`

    const callRes = await fetch(url)
    const text = await callRes.text()
    console.log('CallMeBot:', text)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err), { status: 500 })
  }
})
