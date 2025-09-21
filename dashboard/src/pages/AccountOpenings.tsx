import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import SearchPanel, { SearchSuggestion } from '../components/SearchPanel';
import { getAccountOpenings } from '../api';

interface AccountOpeningRecord {
  id: number;
  realtor: string;
  status: string;
  account_number?: string | null;
}

const formatStatus = (status: string) =>
  status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const AccountOpenings: React.FC = () => {
  const { auth } = useAuth();
  const token = auth?.token;

  const fetchRequests = React.useCallback(
    async (term: string) => {
      if (!token) return [];
      const filters = { status: 'submitted', ...(term ? { q: term } : {}) };
      return getAccountOpenings(token, filters) as Promise<AccountOpeningRecord[]>;
    },
    [token],
  );

  const fetchSuggestions = React.useCallback(
    async (term: string) => {
      if (!token) return [];
      const results = (await getAccountOpenings(token, {
        status: 'submitted',
        q: term,
      })) as AccountOpeningRecord[];
      return results.slice(0, 6).map<SearchSuggestion>(opening => ({
        value: String(opening.id),
        label: `#${opening.id} • ${opening.realtor}`,
        description: opening.account_number ? `Account ${opening.account_number}` : undefined,
      }));
    },
    [token],
  );

  return (
    <div>
      <h2>Account Opening Queue</h2>
      <p>Locate pending account openings by ID, realtor, or assigned account number.</p>
      <SearchPanel<AccountOpeningRecord>
        placeholder="Search by ID, realtor, or account number"
        emptyMessage="No pending requests found."
        performSearch={fetchRequests}
        fetchSuggestions={fetchSuggestions}
        getResultKey={opening => opening.id}
        renderResult={(opening) => (
          <>
            <div>
              <strong>Request #{opening.id}</strong>
            </div>
            <div>
              Realtor: {opening.realtor}
            </div>
            <div>
              Status: {formatStatus(opening.status)}
              {opening.account_number && ` • Account ${opening.account_number}`}
            </div>
            <div>
              <Link to={`/account-openings/${opening.id}`}>View submission</Link>
            </div>
          </>
        )}
      />
    </div>
  );
};

export default AccountOpenings;
