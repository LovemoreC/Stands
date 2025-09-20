import React from 'react';
import { useAuth } from '../auth';
import {
  getLoanApplications,
  decideLoanApplication,
  generateAgreement,
  getPropertyApplications,
} from '../api';

interface LoanApp {
  id: number;
  realtor: string;
  account_id: number;
  property_id?: number;
  property_application_id?: number | null;
  status: string;
}

interface PropertyApplicationSummary {
  id: number;
  status: string;
}

const formatStatus = (status?: string) =>
  status
    ? status
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : '—';

const LoanApplications: React.FC = () => {
  const { auth } = useAuth();
  const [apps, setApps] = React.useState<LoanApp[]>([]);
  const [error, setError] = React.useState('');
  const [sortKey, setSortKey] = React.useState<keyof LoanApp>('id');
  const [ascending, setAscending] = React.useState(true);
  const [comments, setComments] = React.useState<Record<number, string>>({});
  const [propertyStatuses, setPropertyStatuses] = React.useState<Record<number, string>>({});

  const loadPropertyStatuses = React.useCallback(
    (records: LoanApp[]) => {
      if (!auth) return;
      const ids = Array.from(
        new Set(
          records
            .map(record => record.property_application_id)
            .filter((value): value is number => typeof value === 'number'),
        ),
      );
      if (ids.length === 0) {
        setPropertyStatuses({});
        return;
      }
      getPropertyApplications(auth.token)
        .then(all => {
          const mapping: Record<number, string> = {};
          (all as PropertyApplicationSummary[]).forEach(item => {
            if (ids.includes(item.id)) {
              mapping[item.id] = item.status;
            }
          });
          setPropertyStatuses(mapping);
        })
        .catch(() => setPropertyStatuses({}));
    },
    [auth],
  );

  React.useEffect(() => {
    if (auth) {
      getLoanApplications(auth.token, 'submitted')
        .then(data => {
          setApps(data);
          loadPropertyStatuses(data);
        })
        .catch(() => setError('Failed to load applications'));
    }
  }, [auth, loadPropertyStatuses]);

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
        setPropertyStatuses(prev => {
          const next = { ...prev };
          if (app.property_application_id) {
            delete next[app.property_application_id];
          }
          return next;
        });
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
              <th>Property Application</th>
              <th>Property Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id}>
                <td>{app.id}</td>
                <td>{app.realtor}</td>
                <td>{app.account_id}</td>
                <td>{app.property_application_id ?? '—'}</td>
                <td>{formatStatus(propertyStatuses[app.property_application_id ?? -1])}</td>
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
