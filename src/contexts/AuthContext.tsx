import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isMockMode } from '../lib/supabase'
import type { MockUser, UserRole } from '../types'

interface AuthContextType {
  user: User | MockUser | null
  session: Session | null
  loading: boolean
  role: UserRole | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | MockUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setRole((data?.role as UserRole) ?? 'dentist')
  }

  useEffect(() => {
    if (isMockMode) {
      const saved = localStorage.getItem('dentlink_mock_user')
      if (saved) {
        const parsed = JSON.parse(saved)
        setUser(parsed)
        setRole(parsed.role ?? 'lab_admin')
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else setRole(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (isMockMode) {
      if (!email || !password) return { error: 'Email et mot de passe requis' }
      const mockUser: MockUser & { role: UserRole } = {
        id: 'mock-user-id',
        email,
        role: 'lab_admin',
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('dentlink_mock_user', JSON.stringify(mockUser))
      setUser(mockUser)
      setRole('lab_admin')
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    if (isMockMode) {
      localStorage.removeItem('dentlink_mock_user')
      setUser(null)
      setRole(null)
      return
    }
    await supabase.auth.signOut()
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
