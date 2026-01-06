import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface PaymentPlan {
  id: number
  sale_id: number
  total_due: string
  deposit_due: string
  status: string
}

interface Payment {
  id: number
  sale_id: number
  amount: string
  date: string
  method: string
}

const PaymentsPage = () => {
  const queryClient = useQueryClient()
  const [planForm, setPlanForm] = useState({
    sale_id: 1,
    total_due: '0',
    deposit_due: '0',
    installment_amount: '0',
    frequency: 'Monthly',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    status: 'ACTIVE'
  })

  const [paymentForm, setPaymentForm] = useState({
    sale_id: 1,
    amount: '0',
    date: new Date().toISOString().slice(0, 10),
    method: 'BANK',
    reference: '',
    recorded_by: undefined as number | undefined
  })

  const { data: plans } = useQuery({
    queryKey: ['payment-plans'],
    queryFn: async () => (await api.get<PaymentPlan[]>('/payments/plans')).data,
    placeholderData: []
  })

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await api.get<Payment[]>('/payments')).data,
    placeholderData: []
  })

  const createPlan = useMutation({
    mutationFn: () => api.post('/payments/plans', planForm),
    onSuccess: () => queryClient.invalidateQueries()
  })

  const recordPayment = useMutation({
    mutationFn: () => api.post('/payments', paymentForm),
    onSuccess: () => queryClient.invalidateQueries()
  })

  const handlePlanSubmit = (e: FormEvent) => {
    e.preventDefault()
    createPlan.mutate()
  }

  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault()
    recordPayment.mutate()
  }

  return (
    <div>
      <div className="card">
        <h2>Payment Plans</h2>
        <ul>
          {plans?.map((p) => (
            <li key={p.id}>
              Sale {p.sale_id} total {p.total_due} deposit {p.deposit_due} status {p.status}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Create Payment Plan</h3>
        <form onSubmit={handlePlanSubmit}>
          <input type="number" value={planForm.sale_id} onChange={(e) => setPlanForm({ ...planForm, sale_id: Number(e.target.value) })} />
          <input type="number" value={planForm.total_due} onChange={(e) => setPlanForm({ ...planForm, total_due: e.target.value })} />
          <input type="number" value={planForm.deposit_due} onChange={(e) => setPlanForm({ ...planForm, deposit_due: e.target.value })} />
          <input type="number" value={planForm.installment_amount} onChange={(e) => setPlanForm({ ...planForm, installment_amount: e.target.value })} />
          <input value={planForm.frequency} onChange={(e) => setPlanForm({ ...planForm, frequency: e.target.value })} />
          <input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} />
          <input type="date" value={planForm.end_date} onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })} />
          <input value={planForm.status} onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })} />
          <button type="submit">Save Plan</button>
        </form>
      </div>

      <div className="card">
        <h3>Record Payment</h3>
        <form onSubmit={handlePaymentSubmit}>
          <input type="number" value={paymentForm.sale_id} onChange={(e) => setPaymentForm({ ...paymentForm, sale_id: Number(e.target.value) })} />
          <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
          <input value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} />
          <input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Reference" />
          <button type="submit">Record</button>
        </form>
      </div>

      <div className="card">
        <h2>Payments</h2>
        <ul>
          {payments?.map((p) => (
            <li key={p.id}>
              Sale {p.sale_id} paid {p.amount} via {p.method} on {p.date}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default PaymentsPage
