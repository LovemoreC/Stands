import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import StandsPage from './pages/StandsPage'
import ReservationsPage from './pages/ReservationsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import SalesPage from './pages/SalesPage'
import PaymentsPage from './pages/PaymentsPage'
import DashboardPage from './pages/DashboardPage'

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function App() {
  const { token, logout } = useAuth()

  return (
    <div className="container">
      <h1>Stands Portfolio Admin</h1>
      {token && (
        <nav>
          <Link to="/stands">Stands</Link>
          <Link to="/reservations">Reservations</Link>
          <Link to="/approvals">Approvals</Link>
          <Link to="/sales">Sales</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={logout}>Logout</button>
        </nav>
      )}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/stands"
          element={
            <PrivateRoute>
              <StandsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/reservations"
          element={
            <PrivateRoute>
              <ReservationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <PrivateRoute>
              <ApprovalsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <PrivateRoute>
              <SalesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <PrivateRoute>
              <PaymentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to={token ? '/stands' : '/login'} replace />} />
      </Routes>
    </div>
  )
}

export default App
