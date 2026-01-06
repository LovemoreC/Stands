import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface Reservation {
  id: number
  stand_id: number
  client_id: number
  status: string
}

const ApprovalsPage = () => {
  const queryClient = useQueryClient()
  const { data: reservations } = useQuery({
    queryKey: ['reservations', 'pending'],
    queryFn: async () => {
      const res = await api.get<Reservation[]>('/reservations')
      return res.data
    }
  })

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/reservations/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries()
  })

  const reject = useMutation({
    mutationFn: (id: number) => api.post(`/reservations/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries()
  })

  return (
    <div className="card">
      <h2>Pending Approvals</h2>
      <ul>
        {reservations
          ?.filter((r) => r.status === 'PENDING')
          .map((r) => (
            <li key={r.id}>
              Stand {r.stand_id} / Client {r.client_id}
              <button onClick={() => approve.mutate(r.id)}>Approve</button>
              <button onClick={() => reject.mutate(r.id)}>Reject</button>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default ApprovalsPage
