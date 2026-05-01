import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useRTL } from '../../contexts/RTLContext'

export default function AppLayout() {
  const { isRTL } = useRTL()

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
