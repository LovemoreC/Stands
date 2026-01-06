import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface Reservation {
  id: number
  stand_id: number
  client_id: number
  realtor_id: number
  reservation_date: string
  expiry_date: string
  status: string
}

const ReservationsPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    stand_id: 1,
    client_id: 1,
    realtor_id: 1,
    reservation_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    status: 'PENDING'
  })

  const { data: reservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await api.get<Reservation[]>('/reservations')
      return res.data
    }
  })

  const createReservation = useMutation({
    mutationFn: async () => {
      await api.post('/reservations', form)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] })
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    createReservation.mutate()
  }

  return (
    <div>
      <div className="card">
        <h2>My Reservations</h2>
        <ul>
          {reservations?.map((r) => (
            <li key={r.id}>
              Stand {r.stand_id} for client {r.client_id} - {r.status}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Create Reservation</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Stand ID"
            value={form.stand_id}
            onChange={(e) => setForm({ ...form, stand_id: Number(e.target.value) })}
          />
          <input
            type="number"
            placeholder="Client ID"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
          />
          <input
            type="number"
            placeholder="Realtor ID"
            value={form.realtor_id}
            onChange={(e) => setForm({ ...form, realtor_id: Number(e.target.value) })}
          />
          <label>Reservation Date</label>
          <input
            type="date"
            value={form.reservation_date}
            onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
          />
          <label>Expiry Date</label>
          <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          <button type="submit">Reserve</button>
        </form>
      </div>
    </div>
  )
}

export default ReservationsPage
