import React from 'react';
import { useAuth } from '../auth';
import { ImportedLoanAccount, listImportedLoanAccounts } from '../api';

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const renderMetadata = (metadata: Record<string, unknown>) => {
  const entries = Object.entries(metadata || {});
  if (entries.length === 0) {
    return <em>No additional metadata</em>;
  }
  return (
    <dl>
      {entries.map(([key, val]) => (
        <React.Fragment key={key}>
          <dt>{key}</dt>
          <dd>{typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

const ImportedLoanAccounts: React.FC = () => {
  const { auth } = useAuth();
  const [records, setRecords] = React.useState<ImportedLoanAccount[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!auth) return;
    listImportedLoanAccounts(auth.token)
      .then(setRecords)
      .catch(() => setError('Unable to load imported loan accounts.'));
  }, [auth]);

  return (
    <div>
      <h2>Imported Loan Accounts</h2>
      <p className="page-description">
        Loan accounts ingested from external systems are read-only here. Review the funding amounts and audit
        trail before contacting the banking team.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {records.length === 0 && !error ? (
        <p>No imported loan accounts are available.</p>
      ) : (
        <div className="imported-records">
          {records.map((record) => (
            <details key={record.id} className="imported-record">
              <summary>
                <strong>{record.account_number}</strong> – {record.customer_name} (Outstanding:
                {record.outstanding_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })})
              </summary>
              <div className="imported-record__body">
                <section>
                  <h3>Account Details</h3>
                  <dl>
                    <dt>Product</dt>
                    <dd>{record.product_name ?? '—'}</dd>
                    <dt>Status</dt>
                    <dd>{record.status ?? 'Unknown'}</dd>
                    <dt>Principal Amount</dt>
                    <dd>{record.principal_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
                    <dt>Outstanding Balance</dt>
                    <dd>{record.outstanding_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
                    <dt>Interest Rate</dt>
                    <dd>{record.interest_rate != null ? `${record.interest_rate}%` : 'Not provided'}</dd>
                  </dl>
                </section>
                <section>
                  <h3>Source Audit</h3>
                  <dl>
                    <dt>System</dt>
                    <dd>{record.audit.system}</dd>
                    <dt>Reference</dt>
                    <dd>{record.audit.reference}</dd>
                    <dt>Imported At</dt>
                    <dd>{formatDateTime(record.audit.ingested_at)}</dd>
                  </dl>
                  <div>
                    <h4>Source Metadata</h4>
                    {renderMetadata(record.audit.metadata)}
                  </div>
                </section>
                <section>
                  <h3>Internal Metadata</h3>
                  {renderMetadata(record.metadata)}
                </section>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportedLoanAccounts;
