import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Plus, LogOut, User, FileText, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRTL } from '../../contexts/RTLContext'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import NotificationBell from '../../components/ui/NotificationBell'
import { getCurrentProfile } from '../../lib/api'
import type { UserProfile } from '../../types'

export default function PortalLayout() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { isRTL } = useRTL()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    getCurrentProfile().then(setProfile)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/IMG-20260425-WA0004.jpg" alt="logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-slate-800">{t('app.name')}</span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
            Portail Dentiste
          </span>
        </div>

        {/* Right side */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <LanguageSwitcher />

          <NotificationBell orderBasePath="/portal/orders" />

          <button
            onClick={() => navigate('/portal/profile')}
            className={`hidden sm:flex items-center gap-2 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <User size={13} className="text-primary-600" />
              }
            </div>
            <span className="text-sm text-slate-700 font-medium">
              {profile?.full_name || user?.email?.split('@')[0]}
            </span>
          </button>

          <button
            onClick={() => signOut()}
            title={t('auth.logout')}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <div className={`bg-white border-b border-slate-200 px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-none ${isRTL ? 'flex-row-reverse' : ''}`}>
        <NavLink
          to="/portal"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            } ${isRTL ? 'flex-row-reverse' : ''}`
          }
        >
          <ClipboardList size={16} />
          {t('orders.title')}
        </NavLink>
        <NavLink
          to="/portal/new"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            } ${isRTL ? 'flex-row-reverse' : ''}`
          }
        >
          <Plus size={16} />
          {t('orders.new_order')}
        </NavLink>
        <NavLink
          to="/portal/invoices"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            } ${isRTL ? 'flex-row-reverse' : ''}`
          }
        >
          <FileText size={16} />
          Factures
        </NavLink>
        <NavLink
          to="/patients"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            } ${isRTL ? 'flex-row-reverse' : ''}`
          }
        >
          <Users size={16} />
          {t('nav.patients')}
        </NavLink>
      </div>

      <main className="flex-1 p-3 sm:p-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
