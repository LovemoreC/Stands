import React from 'react';
import { useAuth } from '../auth';
import { getLoanApplications, decideLoanApplication, generateAgreement } from '../api';

interface LoanApp {
  id: number;
  realtor: string;
  account_id: number;
  property_id?: number;
  status: string;
}

const LoanApplications: React.FC = () => {
  const { auth } = useAuth();
  const [apps, setApps] = React.useState<LoanApp[]>([]);
  const [error, setError] = React.useState('');
  const [sortKey, setSortKey] = React.useState<keyof LoanApp>('id');
  const [ascending, setAscending] = React.useState(true);
  const [comments, setComments] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (auth) {
      getLoanApplications(auth.token, 'submitted')
        .then(setApps)
        .catch(() => setError('Failed to load applications'));
    }
  }, [auth]);

  const sortBy = (key: keyof LoanApp) => {
    const asc = key === sortKey ? !ascending : true;
    setSortKey(key);
    setAscending(asc);
    const sorted = [...apps].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    setApps(sorted);
  };

  const handleDecision = (id: number, decision: 'approved' | 'rejected') => {
    if (!auth) return;
    const reason = comments[id];
    decideLoanApplication(auth.token, id, { decision, reason })
      .then(app => {
        if (decision === 'approved' && app.property_id) {
          generateAgreement(auth.token, {
            id: app.id,
            loan_application_id: app.id,
            property_id: app.property_id,
          }).catch(() => setError('Failed to generate agreement'));
        }
        setApps(prev => prev.filter(a => a.id !== id));
      })
      .catch(() => setError('Failed to submit decision'));
  };

  return (
    <div>
      <h2>Loan Applications Queue</h2>
      {error && <p>{error}</p>}
      {apps.length === 0 && <p>No pending applications.</p>}
      {apps.length > 0 && (
        <table>
          <thead>
            <tr>
              <th onClick={() => sortBy('id')}>ID</th>
              <th onClick={() => sortBy('realtor')}>Realtor</th>
              <th onClick={() => sortBy('account_id')}>Account</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id}>
                <td>{app.id}</td>
                <td>{app.realtor}</td>
                <td>{app.account_id}</td>
                <td>
                  <input
                    type="text"
                    value={comments[app.id] || ''}
                    onChange={e =>
                      setComments({ ...comments, [app.id]: e.target.value })
                    }
                    placeholder="Comment"
                  />
                  <button onClick={() => handleDecision(app.id, 'approved')}>
                    Approve
                  </button>
                  <button onClick={() => handleDecision(app.id, 'rejected')}>
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

export default LoanApplications;
