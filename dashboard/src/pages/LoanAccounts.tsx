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
    <div>
      <h2>Loan Account Opening</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={agreementId}
          onChange={e => setAgreementId(e.target.value)}
          placeholder="Agreement ID"
        />
        <button type="submit">Open Account</button>
      </form>
      {accountNumber && <p>Account Number: {accountNumber}</p>}
      {error && <p>{error}</p>}
    </div>
  );
};

export default LoanAccounts;
