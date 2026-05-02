import { useEffect, useState, useCallback } from 'react'
import { Search, Trash2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { getDentistUsers, updateDentistStatus, deleteDentistUser } from '../lib/api'
import type { DentistUser, DentistStatus } from '../types'

// ── Status badge ──────────────────────────────────────────────────────────────

const statusCfg: Record<DentistStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending:  { label: 'En attente', dot: 'bg-amber-400',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  active:   { label: 'Actif',      dot: 'bg-green-400',  bg: 'bg-green-100',  text: 'text-green-700' },
  rejected: { label: 'Rejeté',     dot: 'bg-red-400',    bg: 'bg-red-100',    text: 'text-red-700'   },
}

function DentistStatusBadge({ status }: { status: DentistStatus }) {
  const c = statusCfg[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | DentistStatus
type DialogAction = 'reject' | 'suspend' | 'delete'

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dentists() {
  const [users, setUsers] = useState<DentistUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ action: DialogAction; user: DentistUser } | null>(null)
  const [deleteReady, setDeleteReady] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    getDentistUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  // Aktivera bekräftelseknappen för delete efter 3 sekunder
  useEffect(() => {
    if (dialog?.action !== 'delete') return
    setDeleteReady(false)
    const t = setTimeout(() => setDeleteReady(true), 3000)
    return () => clearTimeout(t)
  }, [dialog])

  // ── Filter-räkningar ───────────────────────────────────────────────────────
  const counts: Record<FilterTab, number> = {
    all:      users.length,
    pending:  users.filter((u) => u.status === 'pending').length,
    active:   users.filter((u) => u.status === 'active').length,
    rejected: users.filter((u) => u.status === 'rejected').length,
  }

  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.status !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.clinic.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q)
    )
  })

  // ── Actions ───────────────────────────────────────────────────────────────

  const setStatus = async (user: DentistUser, newStatus: DentistStatus, key: string, msg: string) => {
    setActionLoading(key)
    try {
      await updateDentistStatus(user.id, newStatus)
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u))
      showToast(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = (user: DentistUser) =>
    setStatus(user, 'active', user.id + '-approve', 'Dentiste approuvé')

  const handleReactivate = (user: DentistUser) =>
    setStatus(user, 'active', user.id + '-reactivate', 'Dentiste réactivé')

  const handleConfirm = async () => {
    if (!dialog) return
    const { action, user } = dialog
    setActionLoading(user.id + '-' + action)
    setDialog(null)
    try {
      if (action === 'reject' || action === 'suspend') {
        await updateDentistStatus(user.id, 'rejected')
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: 'rejected' } : u))
        showToast(action === 'reject' ? 'Inscription rejetée' : 'Dentiste suspendu')
      } else {
        await deleteDentistUser(user.id)
        setUsers((prev) => prev.filter((u) => u.id !== user.id))
        showToast('Compte supprimé définitivement')
      }
    } finally {
      setActionLoading(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <PageSpinner />

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'Tous'       },
    { key: 'pending',  label: 'En attente' },
    { key: 'active',   label: 'Actifs'     },
    { key: 'rejected', label: 'Rejetés'    },
  ]

  const dialogMeta: Record<DialogAction, { title: string; body: string; confirmLabel: string; color: string }> = {
    reject:  {
      title:        "Rejeter l'inscription",
      body:         "Rejeter l'inscription de ce dentiste ?",
      confirmLabel: 'Rejeter',
      color:        'bg-red-600 hover:bg-red-700',
    },
    suspend: {
      title:        'Suspendre ce dentiste',
      body:         'Suspendre ce dentiste ? Il ne pourra plus se connecter.',
      confirmLabel: 'Suspendre',
      color:        'bg-orange-500 hover:bg-orange-600',
    },
    delete:  {
      title:        'Supprimer définitivement',
      body:         'Supprimer définitivement ce compte ? Cette action est irréversible.',
      confirmLabel: 'Supprimer définitivement',
      color:        'bg-red-600 hover:bg-red-700',
    },
  }

  const dm = dialog ? dialogMeta[dialog.action] : null

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dentistes</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {counts.all} compte{counts.all !== 1 ? 's' : ''} portail
          {counts.pending > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
              <Clock size={12} />
              {counts.pending} en attente
            </span>
          )}
        </p>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 inset-y-0 my-auto text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, clinique…"
            className="w-full border border-slate-300 rounded-lg text-sm py-2 pl-9 pr-4 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Aucun dentiste trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3">Nom</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Clinique</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Ville</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Inscription</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs shrink-0">
                          {(user.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{user.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{user.email}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{user.clinic || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{user.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {format(new Date(user.created_at), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <DentistStatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">

                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(user)}
                              disabled={!!actionLoading}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-colors"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => setDialog({ action: 'reject', user })}
                              disabled={!!actionLoading}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                            >
                              Rejeter
                            </button>
                          </>
                        )}

                        {user.status === 'active' && (
                          <>
                            <button
                              onClick={() => setDialog({ action: 'suspend', user })}
                              disabled={!!actionLoading}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40 transition-colors"
                            >
                              Suspendre
                            </button>
                            <button
                              onClick={() => setDialog({ action: 'delete', user })}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
                              title="Supprimer définitivement"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                        {user.status === 'rejected' && (
                          <>
                            <button
                              onClick={() => handleReactivate(user)}
                              disabled={!!actionLoading}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40 transition-colors"
                            >
                              Réactiver
                            </button>
                            <button
                              onClick={() => setDialog({ action: 'delete', user })}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
                              title="Supprimer définitivement"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bekräftelsedialoger */}
      {dm && (
        <Modal
          open={!!dialog}
          onClose={() => setDialog(null)}
          title={dm.title}
          maxWidth="sm"
        >
          <p className="text-sm text-slate-600 mb-6">{dm.body}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDialog(null)}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={dialog?.action === 'delete' && !deleteReady}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dm.color}`}
            >
              {dm.confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
