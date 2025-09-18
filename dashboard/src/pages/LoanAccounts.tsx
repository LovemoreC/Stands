import React from 'react';
import { useAuth } from '../auth';
import { openLoanAccount } from '../api';

const LoanAccounts: React.FC = () => {
  const { auth } = useAuth();
  const [agreementId, setAgreementId] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    openLoanAccount(auth.token, Number(agreementId))
      .then(data => {
        setAccountNumber(data.account_number);
        setError('');
      })
      .catch(() => setError('Failed to open loan account'));
  };

  return (
    <section className="form-section">
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="form-title">Loan Account Opening</h2>
        <div className="form-fields">
          <label htmlFor="loan-agreement-id">
            Agreement ID
            <input
              id="loan-agreement-id"
              type="number"
              value={agreementId}
              onChange={e => setAgreementId(e.target.value)}
              placeholder="Enter agreement ID"
            />
          </label>
        </div>
        {accountNumber && (
          <p className="form-message form-message--success">
            Account Number: {accountNumber}
          </p>
        )}
        {error && <p className="form-message form-message--error">{error}</p>}
        <div className="form-actions">
          <button type="submit">Open Account</button>
        </div>
      </form>
    </section>
  );
};

export default LoanAccounts;
