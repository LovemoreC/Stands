import React from 'react';
import { useAuth } from '../auth';
import SearchPanel, { SearchSuggestion } from '../components/SearchPanel';
import { approvePropertyApplication, getPropertyApplications } from '../api';

interface PropertyApplicationRecord {
  id: number;
  property_id: number;
  realtor: string;
  status: string;
  details?: string | null;
}

const formatStatus = (status: string) =>
  status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const PropertyApplicationsQueue: React.FC = () => {
  const { auth } = useAuth();
  const token = auth?.token;
  const [actionError, setActionError] = React.useState('');

  const fetchApplications = React.useCallback(
    async (term: string) => {
      if (!token) return [];
      const filters = { status: 'submitted', ...(term ? { q: term } : {}) };
      return getPropertyApplications(token, filters) as Promise<PropertyApplicationRecord[]>;
    },
    [token],
  );

  const fetchSuggestions = React.useCallback(
    async (term: string) => {
      if (!token) return [];
      const results = (await getPropertyApplications(token, {
        status: 'submitted',
        q: term,
      })) as PropertyApplicationRecord[];
      return results.slice(0, 6).map<SearchSuggestion>(application => ({
        value: String(application.id),
        label: `#${application.id} • ${application.realtor}`,
        description: `Property ${application.property_id}`,
      }));
    },
    [token],
  );

  const handleApprove = React.useCallback(
    async (id: number, refresh: () => void) => {
      if (!token) return;
      try {
        await approvePropertyApplication(token, id);
        setActionError('');
        refresh();
      } catch (err) {
        setActionError('Failed to approve property application.');
      }
    },
    [token],
  );

  return (
    <div>
      <h2>Property Application Review Queue</h2>
      <p>Search for submitted property applications and approve them without leaving the queue.</p>
      {actionError && (
        <p role="alert" className="search-panel__error">
          {actionError}
        </p>
      )}
      <SearchPanel<PropertyApplicationRecord>
        placeholder="Search by application ID, realtor, or property number"
        emptyMessage="No property applications awaiting review."
        performSearch={fetchApplications}
        fetchSuggestions={fetchSuggestions}
        getResultKey={application => application.id}
        renderResult={(application, helpers) => (
          <>
            <div>
              <strong>Application #{application.id}</strong> for property {application.property_id}
            </div>
            <div>Realtor: {application.realtor}</div>
            <div>Status: {formatStatus(application.status)}</div>
            <div>Notes: {application.details ?? '—'}</div>
            <div>
              <button type="button" onClick={() => handleApprove(application.id, helpers.refresh)}>
                Approve application
              </button>
            </div>
          </>
        )}
      />
    </div>
  );
};

export default PropertyApplicationsQueue;
