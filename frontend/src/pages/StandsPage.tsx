import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface Stand {
  id: number
  stand_number: string
  price: string
  size_m2: string
  status: string
  project_id: number
  notes?: string
}

const StandsPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    project_id: 1,
    stand_number: '',
    size_m2: '0',
    price: '0',
    status: 'AVAILABLE',
    notes: ''
  })

  const { data: stands } = useQuery({
    queryKey: ['stands'],
    queryFn: async () => {
      const res = await api.get<Stand[]>('/stands')
      return res.data
    }
  })

  const createStand = useMutation({
    mutationFn: async () => {
      await api.post('/stands', form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stands'] })
      setForm({ ...form, stand_number: '', notes: '' })
    }
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    createStand.mutate()
  }

  return (
    <div>
      <div className="card">
        <h2>Stands</h2>
        <ul>
          {stands?.map((stand) => (
            <li key={stand.id}>
              #{stand.stand_number} - {stand.status} - ${stand.price}
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Add Stand</h3>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Stand Number"
            value={form.stand_number}
            onChange={(e) => setForm({ ...form, stand_number: e.target.value })}
            required
          />
          <input
            placeholder="Price"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            placeholder="Size"
            type="number"
            value={form.size_m2}
            onChange={(e) => setForm({ ...form, size_m2: e.target.value })}
          />
          <input
            placeholder="Project Id"
            type="number"
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: Number(e.target.value) })}
          />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="RESERVED">RESERVED</option>
            <option value="SOLD">SOLD</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <button type="submit" disabled={createStand.isPending}>
            Save
          </button>
        </form>
      </div>
    </div>
  )
}

export default StandsPage
