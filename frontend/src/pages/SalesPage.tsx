import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface Sale {
  id: number
  stand_id: number
  client_id: number
  sale_price: string
  sale_date: string
  status: string
}

const SalesPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    stand_id: 1,
    client_id: 1,
    sale_price: '0',
    sale_date: new Date().toISOString().slice(0, 10),
    status: 'ACTIVE'
  })

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await api.get<Sale[]>('/sales')
      return res.data
    }
  })

  const createSale = useMutation({
    mutationFn: async () => api.post('/sales', form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] })
  })

  const completeSale = useMutation({
    mutationFn: (id: number) => api.post(`/sales/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] })
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    createSale.mutate()
  }

  return (
    <div>
      <div className="card">
        <h2>Sales</h2>
        <ul>
          {sales?.map((s) => (
            <li key={s.id}>
              Stand {s.stand_id} sold to client {s.client_id} at {s.sale_price} - {s.status}
              {s.status !== 'COMPLETED' && <button onClick={() => completeSale.mutate(s.id)}>Mark Completed</button>}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Create Sale</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            value={form.stand_id}
            onChange={(e) => setForm({ ...form, stand_id: Number(e.target.value) })}
            placeholder="Stand ID"
          />
          <input
            type="number"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
            placeholder="Client ID"
          />
          <input
            type="date"
            value={form.sale_date}
            onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
          />
          <input
            type="number"
            value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
            placeholder="Price"
          />
          <button type="submit">Create Sale</button>
        </form>
      </div>
    </div>
  )
}

export default SalesPage
