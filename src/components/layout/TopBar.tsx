import { LogOut, User, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'
import NotificationBell from '../ui/NotificationBell'
import { useAuth } from '../../contexts/AuthContext'
import { useRTL } from '../../contexts/RTLContext'
import { isMockMode } from '../../lib/supabase'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { isRTL } = useRTL()

  const displayName = user?.email?.split('@')[0] ?? 'Admin'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
        {isMockMode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Mode démo
          </span>
        )}
      </div>

      <div className={`flex items-center gap-2 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <LanguageSwitcher />

        <NotificationBell orderBasePath="/orders" />

        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <User size={15} className="text-white" />
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{displayName}</span>
        </div>

        <button
          onClick={() => signOut()}
          title={t('auth.logout')}
          className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
