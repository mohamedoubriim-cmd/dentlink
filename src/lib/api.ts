import { isMockMode, supabase } from './supabase'
import { mockDentists, mockOrders, mockInvoices, mockPatients } from './mockData'
import type { Dentist, Order, Invoice, Patient, OrderStatus, OrderFile, UserProfile } from '../types'

async function getLabId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié — veuillez vous reconnecter')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // lab_staff delar lab_admin's ID som lab_id
  if (profile?.role === 'lab_staff') {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'lab_admin')
      .limit(1)
      .single()
    if (adminProfile) return adminProfile.id
  }

  return user.id
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (isMockMode) return { id: 'mock', role: 'lab_admin', full_name: 'Admin', phone: '', clinic: '', created_at: '' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

export async function updateProfile(updates: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'clinic' | 'avatar_url'>>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) throw new Error(error.message)
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  const ext = file.name.split('.').pop()
  const path = `${user?.id}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

// ── Dentists ──────────────────────────────────────────────────────────────────

let localDentists = [...mockDentists]

export async function getDentists(): Promise<Dentist[]> {
  if (isMockMode) return [...localDentists]
  const { data } = await supabase.from('dentists').select('*').order('name')
  return data || []
}

export async function getDentist(id: string): Promise<Dentist | null> {
  if (isMockMode) return localDentists.find((d) => d.id === id) || null
  const { data } = await supabase.from('dentists').select('*').eq('id', id).single()
  return data
}

export async function createDentist(data: Omit<Dentist, 'id' | 'created_at'>): Promise<Dentist> {
  if (isMockMode) {
    const dentist: Dentist = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() }
    localDentists.push(dentist)
    return dentist
  }
  const lab_id = await getLabId()
  const { data: created, error } = await supabase.from('dentists').insert({ ...data, lab_id }).select().single()
  if (error) throw new Error(error.message)
  return created
}

export async function updateDentist(id: string, data: Partial<Dentist>): Promise<Dentist> {
  if (isMockMode) {
    const idx = localDentists.findIndex((d) => d.id === id)
    if (idx !== -1) localDentists[idx] = { ...localDentists[idx], ...data }
    return localDentists[idx]
  }
  const { data: updated, error } = await supabase.from('dentists').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return updated
}

export async function deleteDentist(id: string): Promise<void> {
  if (isMockMode) { localDentists = localDentists.filter((d) => d.id !== id); return }
  await supabase.from('dentists').delete().eq('id', id)
}

// ── Orders ────────────────────────────────────────────────────────────────────

let localOrders = [...mockOrders]

async function fillDentistFromProfile(orders: Order[]): Promise<Order[]> {
  const missing = orders.filter((o) => !o.dentist && o.dentist_user_id)
  if (missing.length === 0) return orders
  const ids = [...new Set(missing.map((o) => o.dentist_user_id as string))]
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, clinic, phone').in('id', ids)
  const map = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  return orders.map((o) => {
    if (!o.dentist && o.dentist_user_id && map[o.dentist_user_id]) {
      const p = map[o.dentist_user_id]
      return { ...o, dentist: { id: o.dentist_user_id, name: p.full_name || 'Dentiste', clinic: p.clinic || '', phone: p.phone || '', email: '', address: '', city: '', balance: 0, created_at: '' } }
    }
    return o
  })
}

export async function getOrders(): Promise<Order[]> {
  if (isMockMode)
    return [...localOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const { data } = await supabase
    .from('orders')
    .select('*, dentist:dentists(*), files:order_files(*)')
    .order('created_at', { ascending: false })
  return fillDentistFromProfile(data || [])
}

export async function getOrder(id: string): Promise<Order | null> {
  if (isMockMode) {
    const order = localOrders.find((o) => o.id === id)
    if (!order) return null
    return { ...order, dentist: localDentists.find((d) => d.id === order.dentist_id) }
  }
  const { data } = await supabase
    .from('orders')
    .select('*, dentist:dentists(*), files:order_files(*)')
    .eq('id', id)
    .single()
  if (!data) return null
  const [filled] = await fillDentistFromProfile([data])
  return filled
}

async function nextOrderNumber(): Promise<string> {
  const { data } = await supabase.rpc('get_next_order_number')
  return data ?? `CMD-${new Date().getFullYear()}-001`
}

export async function createOrder(
  data: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'dentist' | 'files'>
): Promise<Order> {
  if (isMockMode) {
    const num = localOrders.length + 1
    const order: Order = {
      ...data,
      id: Date.now().toString(),
      order_number: `CMD-2025-${String(num + 48).padStart(3, '0')}`,
      dentist: localDentists.find((d) => d.id === data.dentist_id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localOrders.push(order)
    return order
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié — veuillez vous reconnecter')
  const lab_id = user.id
  const order_number = await nextOrderNumber()
  const insertData: Record<string, unknown> = { ...data, lab_id, order_number }
  if (!insertData.dentist_id) delete insertData.dentist_id
  const { data: created, error } = await supabase
    .from('orders')
    .insert(insertData)
    .select('*, dentist:dentists(*)')
    .single()
  if (error) throw new Error(error.message)
  return created
}

export async function createOrderAsDentist(
  data: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'dentist' | 'files'>
): Promise<Order> {
  if (isMockMode) {
    const num = localOrders.length + 1
    const order: Order = {
      ...data,
      id: Date.now().toString(),
      order_number: `CMD-2025-${String(num + 48).padStart(3, '0')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localOrders.push(order)
    return order
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié — veuillez vous reconnecter')
  const dentist_user_id = user.id

  const { data: labProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'lab_admin')
    .limit(1)
    .single()
  if (!labProfile) throw new Error('Aucun laboratoire trouvé — contactez votre administrateur')
  const lab_id = labProfile.id

  const order_number = await nextOrderNumber()
  const insertData: Record<string, unknown> = { ...data, dentist_user_id, lab_id, order_number }
  if (!insertData.dentist_id) delete insertData.dentist_id
  const { data: created, error } = await supabase
    .from('orders')
    .insert(insertData)
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  // Skicka in-app notis till alla lab-användare (lab_admin + lab_staff)
  const { data: labUsers } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['lab_admin', 'lab_staff'])
  if (labUsers && labUsers.length > 0) {
    await supabase.from('notifications').insert(
      labUsers.map((u) => ({
        user_id: u.id,
        title: 'Nouvelle commande',
        message: `Commande ${created.order_number} — ${data.patient_name}`,
        order_id: created.id,
      }))
    )
  }

  return created
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  if (isMockMode) {
    const idx = localOrders.findIndex((o) => o.id === id)
    if (idx !== -1) {
      localOrders[idx] = {
        ...localOrders[idx],
        status,
        updated_at: new Date().toISOString(),
        delivery_date: status === 'delivered' ? new Date().toISOString().split('T')[0] : localOrders[idx].delivery_date,
      }
    }
    return
  }
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, dentist_user_id, dentist_id, dentist:dentists(email)')
    .eq('id', id)
    .single()

  await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)

  if (order) {
    let targetUserId: string | null = order.dentist_user_id ?? null
    if (!targetUserId) {
      const dentistEmail = (order.dentist as any)?.email
      if (dentistEmail) {
        const { data: profile } = await supabase
          .from('profiles').select('id').eq('email', dentistEmail).eq('role', 'dentist').maybeSingle()
        if (profile) targetUserId = profile.id
      }
    }
    const messages: Partial<Record<OrderStatus, string>> = {
      in_progress: `Commande ${order.order_number} — Empreinte reçue, travail en cours`,
      ready:       `Commande ${order.order_number} — Prête, expédition en cours`,
      delivered:   `Commande ${order.order_number} — Expédiée`,
      cancelled:   `Commande ${order.order_number} — Annulée`,
    }
    if (targetUserId && messages[status]) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: 'Mise à jour de commande',
        message: messages[status],
        order_id: id,
        read: false,
      })
    }
  }
}

export async function updateTrackingNumber(id: string, tracking_number: string): Promise<void> {
  if (isMockMode) {
    const idx = localOrders.findIndex((o) => o.id === id)
    if (idx !== -1) localOrders[idx] = { ...localOrders[idx], tracking_number }
    return
  }
  await supabase.from('orders').update({ tracking_number }).eq('id', id)
}

export async function hideOrderForDentist(id: string): Promise<void> {
  if (isMockMode) {
    const idx = localOrders.findIndex((o) => o.id === id)
    if (idx !== -1) localOrders[idx] = { ...localOrders[idx], hidden_for_dentist: true }
    return
  }
  const { error } = await supabase.from('orders').update({ hidden_for_dentist: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateOrderPrice(id: string, price: number): Promise<void> {
  if (isMockMode) {
    const idx = localOrders.findIndex((o) => o.id === id)
    if (idx !== -1) localOrders[idx] = { ...localOrders[idx], price }
    return
  }
  await supabase.from('orders').update({ price, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteOrder(id: string): Promise<void> {
  if (isMockMode) { localOrders = localOrders.filter((o) => o.id !== id); return }
  await supabase.from('orders').delete().eq('id', id)
}

// ── Order Files ───────────────────────────────────────────────────────────────

export async function uploadOrderFile(orderId: string, file: File): Promise<OrderFile> {
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? 'unknown'
  const ext = file.name.split('.').pop()
  const storagePath = `${userId}/${orderId}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('order-files')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('order_files')
    .insert({
      order_id: orderId,
      name: file.name,
      size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      uploaded_by: userId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getOrderFiles(orderId: string): Promise<OrderFile[]> {
  if (isMockMode) return []
  const { data } = await supabase.from('order_files').select('*').eq('order_id', orderId)
  return data || []
}

export async function getFileDownloadUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('order-files')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? ''
}

export async function deleteOrderFile(fileId: string, storagePath: string): Promise<void> {
  await supabase.storage.from('order-files').remove([storagePath])
  await supabase.from('order_files').delete().eq('id', fileId)
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabase.rpc('get_user_id_by_email', { user_email: email })
  return data ?? null
}

// ── Invoices ──────────────────────────────────────────────────────────────────

let localInvoices = [...mockInvoices]

export async function getMyInvoices(): Promise<Invoice[]> {
  if (isMockMode) return []
  const { data, error } = await supabase
    .from('invoices')
    .select('*, dentist:dentists(*)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getInvoices(): Promise<Invoice[]> {
  if (isMockMode)
    return [...localInvoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const { data } = await supabase.from('invoices').select('*, dentist:dentists(*)').order('created_at', { ascending: false })
  return data || []
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (isMockMode) return localInvoices.find((i) => i.id === id) ?? null
  const { data } = await supabase.from('invoices').select('*, dentist:dentists(*)').eq('id', id).single()
  return data
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
  if (isMockMode) {
    const idx = localInvoices.findIndex((i) => i.id === id)
    if (idx !== -1) localInvoices[idx] = { ...localInvoices[idx], status }
    return
  }
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, total, dentist_id, dentist:dentists(email)')
    .eq('id', id)
    .single()

  await supabase.from('invoices').update({ status }).eq('id', id)

  if (invoice) {
    const dentistEmail = (invoice.dentist as any)?.email
    if (dentistEmail) {
      const userId = await getUserIdByEmail(dentistEmail)
      if (userId) {
        const labels: Record<string, string> = {
          paid:    'réglée',
          unpaid:  'impayée',
          partial: 'partiellement réglée',
        }
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Statut de facture mis à jour',
          message: `Facture ${invoice.invoice_number} (${invoice.total} MAD) — ${labels[status] ?? status}`,
          order_id: null,
          read: false,
        })
      }
    }
  }
}

export async function createInvoice(data: Omit<Invoice, 'id' | 'invoice_number' | 'created_at' | 'dentist'>): Promise<Invoice> {
  if (isMockMode) {
    const invoice: Invoice = {
      ...data,
      id: Date.now().toString(),
      invoice_number: `FAC-2025-${String(localInvoices.length + 13).padStart(3, '0')}`,
      dentist: localDentists.find((d) => d.id === data.dentist_id),
      created_at: new Date().toISOString(),
    }
    localInvoices.push(invoice)
    return invoice
  }
  const lab_id = await getLabId()
  const year = new Date().getFullYear()
  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
  const invoice_number = `FAC-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
  const { data: created, error } = await supabase
    .from('invoices')
    .insert({ ...data, lab_id, invoice_number })
    .select('*, dentist:dentists(*)')
    .single()
  if (error) throw new Error(error.message)

  // Notify dentist
  const dentistEmail = (created.dentist as any)?.email
  if (dentistEmail) {
    const userId = await getUserIdByEmail(dentistEmail)
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Nouvelle facture',
        message: `Facture ${created.invoice_number} — ${created.total} MAD TTC`,
        order_id: null,
        read: false,
      })
    }
  }

  return created
}

// ── Patients ──────────────────────────────────────────────────────────────────

let localPatients = [...mockPatients]

export async function getPatients(): Promise<Patient[]> {
  if (isMockMode) return [...localPatients].sort((a, b) => a.name.localeCompare(b.name))
  const { data } = await supabase.from('patients').select('*, dentist:dentists(*)').order('name')
  return data || []
}

export async function createPatient(data: Omit<Patient, 'id' | 'created_at' | 'dentist'>): Promise<Patient> {
  if (isMockMode) {
    const patient: Patient = {
      ...data,
      id: Date.now().toString(),
      dentist: localDentists.find((d) => d.id === data.dentist_id),
      created_at: new Date().toISOString(),
    }
    localPatients.push(patient)
    return patient
  }
  const lab_id = await getLabId()
  const { data: created, error } = await supabase
    .from('patients')
    .insert({ ...data, lab_id })
    .select('*, dentist:dentists(*)')
    .single()
  if (error) throw new Error(error.message)
  return created
}
