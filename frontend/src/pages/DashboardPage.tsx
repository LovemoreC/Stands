import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface Stand { status: string }
interface Reservation { status: string }
interface Sale { status: string }

const DashboardPage = () => {
  const { data: stands } = useQuery({ queryKey: ['stands'], queryFn: async () => (await api.get<Stand[]>('/stands')).data })
  const { data: reservations } = useQuery({ queryKey: ['reservations'], queryFn: async () => (await api.get<Reservation[]>('/reservations')).data })
  const { data: sales } = useQuery({ queryKey: ['sales'], queryFn: async () => (await api.get<Sale[]>('/sales')).data })

  const stats = {
    available: stands?.filter((s) => s.status === 'AVAILABLE').length ?? 0,
    reserved: stands?.filter((s) => s.status === 'RESERVED').length ?? 0,
    sold: stands?.filter((s) => s.status === 'SOLD').length ?? 0,
    pendingReservations: reservations?.filter((r) => r.status === 'PENDING').length ?? 0,
    activeSales: sales?.filter((s) => s.status === 'ACTIVE').length ?? 0
  }

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <ul>
        <li>Available stands: {stats.available}</li>
        <li>Reserved stands: {stats.reserved}</li>
        <li>Sold stands: {stats.sold}</li>
        <li>Pending reservations: {stats.pendingReservations}</li>
        <li>Active sales: {stats.activeSales}</li>
      </ul>
    </div>
  )
}

export default DashboardPage
