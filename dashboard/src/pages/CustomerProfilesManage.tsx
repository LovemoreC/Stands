import React from 'react';
import { useAuth } from '../auth';
import {
  CustomerProfile,
  deleteCustomerProfile,
  getCustomerProfile,
} from '../api';

const CustomerProfilesManage: React.FC = () => {
  const { auth } = useAuth();
  const [accountNumber, setAccountNumber] = React.useState('');
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  const handleLookup: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!auth) return;
    const trimmed = accountNumber.trim();
    if (!trimmed) {
      setError('Enter an account number to continue.');
      return;
    }
    try {
      const data = await getCustomerProfile(auth.token, trimmed);
      setProfile(data);
      setStatus('Profile loaded successfully.');
      setError('');
    } catch (err) {
      setProfile(null);
      setStatus('');
      setError('Unable to find a profile for that account number.');
    }
  };

  const handleDelete = async () => {
    if (!auth || !profile) return;
    try {
      await deleteCustomerProfile(auth.token, profile.account_number);
      setStatus('Profile deleted.');
      setProfile(null);
      setError('');
    } catch (err) {
      setError('Unable to delete profile. Ensure a deletion request is on file.');
      setStatus('');
    }
  };

  return (
    <div>
      <h2>Customer Profiles</h2>
      <form onSubmit={handleLookup} className="form" aria-label="Profile lookup">
        <label htmlFor="manageAccountNumber">Account Number</label>
        <input
          id="manageAccountNumber"
          type="text"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
        />
        <button type="submit">Lookup</button>
      </form>
      {status && <p>{status}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {profile && (
        <section aria-live="polite">
          <h3>Profile Summary</h3>
          <dl>
            <dt>Account Number</dt>
            <dd>{profile.account_number}</dd>
            <dt>Account Opening ID</dt>
            <dd>{profile.account_opening_id ?? 'Not linked'}</dd>
            <dt>Realtor</dt>
            <dd>{profile.realtor ?? 'Unknown'}</dd>
            <dt>Loan Applications</dt>
            <dd>{profile.loan_application_ids.length ? profile.loan_application_ids.join(', ') : 'None'}</dd>
            <dt>Agreements</dt>
            <dd>{profile.agreement_ids.length ? profile.agreement_ids.join(', ') : 'None'}</dd>
            <dt>Last Inbound Email</dt>
            <dd>{profile.last_inbound_email_at ?? 'No inbound messages'}</dd>
            <dt>Deletion Requested</dt>
            <dd>{profile.deletion_requested ? 'Yes' : 'No'}</dd>
            {profile.deletion_requested && (
              <>
                <dt>Requested By</dt>
                <dd>{profile.deletion_requested_by ?? 'Unknown'}</dd>
                <dt>Requested At</dt>
                <dd>{profile.deletion_requested_at ?? 'Unknown'}</dd>
              </>
            )}
          </dl>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!profile.deletion_requested}
          >
            Delete Profile
          </button>
        </section>
      )}
    </div>
  );
};

export default CustomerProfilesManage;
