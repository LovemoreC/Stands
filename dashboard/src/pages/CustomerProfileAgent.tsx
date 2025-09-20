import React from 'react';
import { useAuth } from '../auth';
import {
  CustomerProfile,
  StoredFile,
  getCustomerProfile,
  requestProfileDeletion,
} from '../api';

const CustomerProfileAgent: React.FC = () => {
  const { auth } = useAuth();
  const [accountNumber, setAccountNumber] = React.useState('');
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  const handleDownloadDocument = (label: string, file: StoredFile) => {
    const byteString = window.atob(file.content);
    const len = byteString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: file.content_type || 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = file.filename || label;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

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

  const handleRequestDeletion = async () => {
    if (!auth || !profile) return;
    try {
      const data = await requestProfileDeletion(auth.token, profile.account_number);
      setProfile(data);
      setStatus('Deletion request submitted for review.');
      setError('');
    } catch (err) {
      setError('Unable to request deletion at this time.');
      setStatus('');
    }
  };

  return (
    <div>
      <h2>Customer Profile</h2>
      <form onSubmit={handleLookup} className="form" aria-label="Profile lookup">
        <label htmlFor="accountNumber">Account Number</label>
        <input
          id="accountNumber"
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
            <dt>Documents</dt>
            <dd>
              {profile.documents && Object.keys(profile.documents).length > 0 ? (
                <ul>
                  {Object.entries(profile.documents).map(([key, file]) => (
                    <li key={key}>
                      {file.filename || key}{' '}
                      <button type="button" onClick={() => handleDownloadDocument(key, file)}>
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No uploaded documents</span>
              )}
            </dd>
          </dl>
          <button
            type="button"
            onClick={handleRequestDeletion}
            disabled={profile.deletion_requested}
          >
            {profile.deletion_requested ? 'Deletion Requested' : 'Request Deletion'}
          </button>
        </section>
      )}
    </div>
  );
};

export default CustomerProfileAgent;
