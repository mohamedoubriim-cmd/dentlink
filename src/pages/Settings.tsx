import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Building2, Globe, Check } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useRTL } from '../contexts/RTLContext'

const languages = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
  { code: 'ma', label: 'الدارجة', flag: '🇲🇦', dir: 'rtl' },
]

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { isRTL } = useRTL()
  const [saved, setSaved] = useState(false)

  const [labForm, setLabForm] = useState({
    name: 'Laboratoire Dentaire Central',
    address: '47 Avenue Hassan II, Casablanca',
    phone: '+212 5 22 XX XX XX',
    email: 'contact@labo-dental.ma',
    city: 'Casablanca',
  })

  const handleSaveLab = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const Tab = ({
    icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      } ${isRTL ? 'flex-row-reverse' : ''}`}
    >
      {icon}
      {label}
    </button>
  )

  const [activeTab, setActiveTab] = useState<'profile' | 'lab' | 'language'>('profile')

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">{t('settings.title')}</h1>

      {/* Tabs */}
      <div className={`flex gap-1 bg-slate-100 p-1 rounded-xl w-fit ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Tab
          icon={<User size={15} />}
          label={t('settings.profile_section')}
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
        <Tab
          icon={<Building2 size={15} />}
          label={t('settings.lab_section')}
          active={activeTab === 'lab'}
          onClick={() => setActiveTab('lab')}
        />
        <Tab
          icon={<Globe size={15} />}
          label={t('settings.language_section')}
          active={activeTab === 'language'}
          onClick={() => setActiveTab('language')}
        />
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
            {t('settings.profile_section')}
          </h2>
          <div className={`flex items-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <p className="font-semibold text-slate-800">{user?.email?.split('@')[0] ?? 'Admin'}</p>
              <p className="text-sm text-slate-500">{user?.email ?? ''}</p>
              <p className="text-xs text-primary-600 mt-0.5">Administrateur</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input
              label={t('settings.full_name')}
              defaultValue={user?.email?.split('@')[0] ?? 'Admin'}
              placeholder="Votre nom"
            />
            <Input
              label={t('auth.email')}
              type="email"
              defaultValue={user?.email ?? ''}
              disabled
            />
          </div>
          <Button className="mt-5">{t('settings.save_changes')}</Button>
        </Card>
      )}

      {/* Lab Tab */}
      {activeTab === 'lab' && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
            {t('settings.lab_section')}
          </h2>
          <div className="space-y-4">
            <Input
              label={t('settings.lab_name')}
              value={labForm.name}
              onChange={(e) => setLabForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              label={t('settings.lab_phone')}
              value={labForm.phone}
              onChange={(e) => setLabForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <Input
              label={t('settings.lab_email')}
              type="email"
              value={labForm.email}
              onChange={(e) => setLabForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              label={t('settings.lab_address')}
              value={labForm.address}
              onChange={(e) => setLabForm((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className={`flex items-center gap-3 mt-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={handleSaveLab} icon={saved ? <Check size={16} /> : undefined}>
              {saved ? t('settings.saved') : t('settings.save_changes')}
            </Button>
          </div>
        </Card>
      )}

      {/* Language Tab */}
      {activeTab === 'language' && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
            {t('settings.language_section')}
          </h2>
          <p className="text-sm text-slate-500 mb-5">{t('settings.choose_language')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {languages.map((lang) => {
              const active = i18n.language === lang.code
              return (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    active
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  } ${lang.dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className={lang.dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <p
                      className={`font-semibold text-sm ${
                        active ? 'text-primary-700' : 'text-slate-700'
                      }`}
                    >
                      {lang.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang.dir === 'rtl' ? 'RTL' : 'LTR'}
                    </p>
                  </div>
                  {active && (
                    <div className="ms-auto w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
