import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, AlertCircle, User, Stethoscope } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { isMockMode, supabase } from '../../lib/supabase'

export default function Login() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role: 'dentist' } },
      })
      if (err) {
        setError(err.message)
      } else {
        // Auto-login after signup
        await signIn(email, password)
      }
    } else {
      const { error: err } = await signIn(email, password)
      if (err) setError(err)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 flex flex-col">
      <div className="flex justify-end p-4">
        <LanguageSwitcher variant="dark" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 overflow-hidden">
              <img src="/IMG-20260425-WA0004.jpg" alt="logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold text-white">{t('app.name')}</h1>
            <p className="text-slate-400 mt-1">{t('app.tagline')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('auth.login')}
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Créer un compte
              </button>
            </div>

            {isMockMode && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">{t('auth.demo_hint')}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl">
                    <Stethoscope size={16} className="text-primary-600 shrink-0" />
                    <p className="text-xs text-primary-700 font-medium">Inscription réservée aux dentistes partenaires</p>
                  </div>

                  <Input
                    label="Nom complet"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Ahmed Bennani"
                    icon={<User size={16} />}
                  />
                </>
              )}

              <Input
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.ma"
                required
                icon={<Mail size={16} />}
                autoComplete="email"
              />
              <Input
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                icon={<Lock size={16} />}
                hint={mode === 'signup' ? 'Minimum 6 caractères' : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {mode === 'login' ? t('auth.sign_in') : 'Créer mon compte dentiste'}
              </Button>
            </form>
          </div>

          <p className="text-center text-slate-500 text-xs mt-6">
            © {new Date().getFullYear()} DentLink — Maroc
          </p>
        </div>
      </div>
    </div>
  )
}
