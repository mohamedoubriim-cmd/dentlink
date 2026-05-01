import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { RTLProvider } from './contexts/RTLContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import NewOrder from './pages/NewOrder'
import OrderDetail from './pages/OrderDetail'
import Dentists from './pages/Dentists'
import NewDentist from './pages/NewDentist'
import Patients from './pages/Patients'
import Invoices from './pages/Invoices'
import Settings from './pages/Settings'
import InvoicePrint from './pages/InvoicePrint'
import PortalLayout from './pages/portal/PortalLayout'
import PortalOrders from './pages/portal/PortalOrders'
import PortalNewOrder from './pages/portal/PortalNewOrder'
import PortalOrderDetail from './pages/portal/PortalOrderDetail'
import PortalProfile from './pages/portal/PortalProfile'
import PortalInvoices from './pages/portal/PortalInvoices'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
    </div>
  )
}

function AuthGate() {
  const { user, role, loading } = useAuth()

  if (loading) return <Spinner />

  if (!user) return <Navigate to="/login" replace />

  // Dentists → portal
  if (role === 'dentist') {
    return (
      <Routes>
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalOrders />} />
          <Route path="/portal/new" element={<PortalNewOrder />} />
          <Route path="/portal/orders/:id" element={<PortalOrderDetail />} />
          <Route path="/portal/profile" element={<PortalProfile />} />
          <Route path="/portal/invoices" element={<PortalInvoices />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>
      </Routes>
    )
  }

  // Lab admins → full dashboard
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/new" element={<NewOrder />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/dentists" element={<Dentists />} />
        <Route path="/dentists/new" element={<NewDentist />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RTLProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/invoices/:id/print" element={<InvoicePrint />} />
            <Route path="/*" element={<AuthGate />} />
          </Routes>
        </BrowserRouter>
      </RTLProvider>
    </AuthProvider>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to={role === 'dentist' ? '/portal' : '/dashboard'} replace />
  return <>{children}</>
}
