import React from 'react';
import { useAuth } from '../auth';
import { approvePropertyApplication, getPropertyApplications } from '../api';

interface PropertyApplicationRecord {
  id: number;
  property_id: number;
  realtor: string;
  status: string;
  details?: string | null;
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'manager_approved', label: 'Manager Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const formatStatus = (status: string) =>
  status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const PropertyApplicationsQueue: React.FC = () => {
  const { auth } = useAuth();
  const [applications, setApplications] = React.useState<PropertyApplicationRecord[]>([]);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('submitted');

  const loadApplications = React.useCallback(() => {
    if (!auth) return;
    setIsLoading(true);
    const statusParam = statusFilter === 'all' ? undefined : statusFilter;
    getPropertyApplications(auth.token, statusParam)
      .then(data => {
        setApplications(data);
        setError('');
      })
      .catch(() => setError('Unable to load property applications.'))
      .finally(() => setIsLoading(false));
  }, [auth, statusFilter]);

  React.useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
  };

  const handleApprove = async (id: number) => {
    if (!auth) return;
    try {
      await approvePropertyApplication(auth.token, id);
      setApplications(prev => prev.filter(app => app.id !== id));
      setError('');
    } catch (err) {
      setError('Failed to approve property application.');
    }
  };

  return (
    <div>
      <h2>Property Application Review Queue</h2>
      {error && <p role="alert">{error}</p>}
      <div className="form-fields" style={{ maxWidth: 320 }}>
        <label htmlFor="property-status-filter">
          Filter by status
          <select
            id="property-status-filter"
            value={statusFilter}
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {isLoading && <p>Loading applications…</p>}
      {!isLoading && applications.length === 0 && <p>No applications awaiting review.</p>}
      {applications.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead className="data-table__header">
              <tr>
                <th scope="col">Application</th>
                <th scope="col">Property</th>
                <th scope="col">Realtor</th>
                <th scope="col">Notes</th>
                <th scope="col">Workflow Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td>#{app.id}</td>
                  <td>{app.property_id}</td>
                  <td>{app.realtor}</td>
                  <td>{app.details ?? '—'}</td>
                  <td>{formatStatus(app.status)}</td>
                  <td>
                    <button type="button" onClick={() => handleApprove(app.id)}>
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PropertyApplicationsQueue;
