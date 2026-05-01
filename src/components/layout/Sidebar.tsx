import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  ClipboardList,
  Stethoscope,
  Users,
  FileText,
  Settings,
} from 'lucide-react'
import { useRTL } from '../../contexts/RTLContext'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { path: '/orders', icon: ClipboardList, key: 'nav.orders' },
  { path: '/dentists', icon: Stethoscope, key: 'nav.dentists' },
  { path: '/patients', icon: Users, key: 'nav.patients' },
  { path: '/invoices', icon: FileText, key: 'nav.invoices' },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()

  return (
    <aside
      className={`w-64 shrink-0 bg-slate-900 text-white flex flex-col h-full overflow-hidden ${
        isRTL ? 'border-l border-slate-700' : 'border-r border-slate-700'
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
            <img src="/IMG-20260425-WA0004.jpg" alt="logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">{t('app.name')}</h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-none">{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, key }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              } ${isRTL ? 'flex-row-reverse' : ''}`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t border-slate-700/60">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            } ${isRTL ? 'flex-row-reverse' : ''}`
          }
        >
          <Settings size={18} className="shrink-0" />
          <span>{t('nav.settings')}</span>
        </NavLink>
      </div>
    </aside>
  )
}
