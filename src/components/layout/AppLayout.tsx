import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useRTL } from '../../contexts/RTLContext'

export default function AppLayout() {
  const { isRTL } = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const msg = (location.state as Record<string, unknown> | null)?.deniedMsg
    if (typeof msg === 'string') {
      setToast(msg)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm flex items-center gap-3">
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="text-amber-500 hover:text-amber-700 transition-colors">✕</button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
