import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { getPendingDeposits } from '../api';

interface AccountOpening {
  id: number;
  realtor: string;
  status: string;
}

const Deposits: React.FC = () => {
  const { auth } = useAuth();
  const [requests, setRequests] = React.useState<AccountOpening[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (auth) {
      getPendingDeposits(auth.token)
        .then(setRequests)
        .catch(() => setError('Failed to load requests'));
    }
  }, [auth]);

  return (
    <div>
      <h2>Deposits Queue</h2>
      {error && <p>{error}</p>}
      {requests.length === 0 && <p>No pending requests.</p>}
      <ul>
        {requests.map(r => (
          <li key={r.id}>
            #{r.id} - {r.realtor} - {r.status}{' '}
            <Link to={`/deposits/${r.id}`}>Details</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Deposits;
