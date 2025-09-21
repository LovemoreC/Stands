import React from 'react';
import { useAuth } from '../auth';
import SearchPanel, { SearchSuggestion } from '../components/SearchPanel';
import {
  getLoanApplications,
  decideLoanApplication,
  generateAgreement,
  getPropertyApplications,
} from '../api';

interface LoanApplicationRecord {
  id: number;
  realtor: string;
  account_id: number;
  property_id?: number | null;
  property_application_id?: number | null;
  status: string;
  loan_account_number?: string | null;
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
  const token = auth?.token;
  const [actionError, setActionError] = React.useState('');
  const [comments, setComments] = React.useState<Record<number, string>>({});
  const [propertyStatuses, setPropertyStatuses] = React.useState<Record<number, string>>({});

  const loadPropertyStatuses = React.useCallback(
    async (records: LoanApplicationRecord[]) => {
      if (!token) {
        setPropertyStatuses({});
        return;
      }
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
      try {
        const all = (await getPropertyApplications(token)) as PropertyApplicationSummary[];
        const mapping: Record<number, string> = {};
        all.forEach(item => {
          if (ids.includes(item.id)) {
            mapping[item.id] = item.status;
          }
        });
        setPropertyStatuses(mapping);
      } catch (err) {
        setPropertyStatuses({});
      }
    },
    [token],
  );

  const fetchLoanApps = React.useCallback(
    async (term: string) => {
      if (!token) return [];
      const filters = { status: 'submitted', ...(term ? { q: term } : {}) };
      const data = (await getLoanApplications(token, filters)) as LoanApplicationRecord[];
      setComments(prev => {
        const next: Record<number, string> = {};
        data.forEach(app => {
          if (prev[app.id]) {
            next[app.id] = prev[app.id];
          }
        });
        return next;
      });
      void loadPropertyStatuses(data);
      return data;
    },
    [token, loadPropertyStatuses],
  );

  const fetchSuggestions = React.useCallback(
    async (term: string) => {
      if (!token) return [];
      const results = (await getLoanApplications(token, {
        status: 'submitted',
        q: term,
      })) as LoanApplicationRecord[];
      return results.slice(0, 6).map<SearchSuggestion>(application => ({
        value: String(application.id),
        label: `#${application.id} • ${application.realtor}`,
        description: `Account ${application.account_id}`,
      }));
    },
    [token],
  );

  const handleDecision = React.useCallback(
    async (application: LoanApplicationRecord, decision: 'approved' | 'rejected', refresh: () => void) => {
      if (!token) return;
      const reason = comments[application.id];
      try {
        const updated = await decideLoanApplication(token, application.id, { decision, reason });
        setActionError('');
        if (decision === 'approved' && updated.property_id) {
          try {
            await generateAgreement(token, {
              id: updated.id,
              loan_application_id: updated.id,
              property_id: updated.property_id,
            });
          } catch (err) {
            setActionError('Failed to generate agreement');
          }
        }
        refresh();
        setComments(prev => {
          const next = { ...prev };
          delete next[application.id];
          return next;
        });
      } catch (err) {
        setActionError('Failed to submit decision');
      }
    },
    [token, comments],
  );

  return (
    <div>
      <h2>Loan Applications Queue</h2>
      <p>Review loan applications, capture manager feedback, and approve or reject directly from search results.</p>
      {actionError && (
        <p role="alert" className="search-panel__error">
          {actionError}
        </p>
      )}
      <SearchPanel<LoanApplicationRecord>
        placeholder="Search by application ID, realtor, property, or account"
        emptyMessage="No loan applications awaiting review."
        performSearch={fetchLoanApps}
        fetchSuggestions={fetchSuggestions}
        getResultKey={application => application.id}
        renderResult={(application, helpers) => (
          <>
            <div>
              <strong>Loan #{application.id}</strong> for account {application.account_id}
            </div>
            <div>Realtor: {application.realtor}</div>
            <div>
              Property Application: {application.property_application_id ?? '—'} • Status:{' '}
              {formatStatus(propertyStatuses[application.property_application_id ?? -1])}
            </div>
            <div className="loan-result__actions">
              <label className="loan-result__comment">
                <span>Comment</span>
                <input
                  type="text"
                  value={comments[application.id] ?? ''}
                  onChange={event =>
                    setComments(prev => ({ ...prev, [application.id]: event.target.value }))
                  }
                  placeholder="Optional notes"
                />
              </label>
              <div className="loan-result__buttons">
                <button type="button" onClick={() => handleDecision(application, 'approved', helpers.refresh)}>
                  Approve
                </button>
                <button type="button" onClick={() => handleDecision(application, 'rejected', helpers.refresh)}>
                  Reject
                </button>
              </div>
            </div>
          </>
        )}
      />
    </div>
  );
};

export default LoanApplications;
