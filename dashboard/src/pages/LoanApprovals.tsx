import React from 'react';
import { useAuth } from '../auth';
import { getPendingLoans, decideLoan } from '../api';

interface Loan {
  id: number;
  borrower: string;
  amount: number;
  status: string;
}

const LoanApprovals: React.FC = () => {
  const { auth } = useAuth();
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [error, setError] = React.useState('');
  const [comments, setComments] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (auth) {
      getPendingLoans(auth.token)
        .then(setLoans)
        .catch(() => setError('Failed to load loans'));
    }
  }, [auth]);

  const handleDecision = (id: number, decision: 'approved' | 'rejected') => {
    if (!auth) return;
    const reason = comments[id];
    decideLoan(auth.token, id, { decision, reason })
      .then(() => setLoans(prev => prev.filter(l => l.id !== id)))
      .catch(() => setError('Failed to submit decision'));
  };

  return (
    <div>
      <h2>Loan Approvals</h2>
      {error && <p>{error}</p>}
      {loans.length === 0 && <p>No pending loans.</p>}
      {loans.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Borrower</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => (
              <tr key={loan.id}>
                <td>{loan.id}</td>
                <td>{loan.borrower}</td>
                <td>{loan.amount}</td>
                <td>
                  <input
                    type="text"
                    value={comments[loan.id] || ''}
                    onChange={e =>
                      setComments({ ...comments, [loan.id]: e.target.value })
                    }
                    placeholder="Comment"
                  />
                  <button onClick={() => handleDecision(loan.id, 'approved')}>
                    Approve
                  </button>
                  <button onClick={() => handleDecision(loan.id, 'rejected')}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LoanApprovals;
