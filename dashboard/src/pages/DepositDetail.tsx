import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  getAccountOpening,
  openDepositAccount,
  recordAccountDeposit,
  approveAccountOpening,
} from '../api';

interface AccountOpening {
  id: number;
  realtor: string;
  status: string;
  account_number?: string;
  deposit_threshold?: number;
  deposits: number[];
}

const DepositDetail: React.FC = () => {
  const { id } = useParams();
  const { auth } = useAuth();
  const [opening, setOpening] = React.useState<AccountOpening | null>(null);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [threshold, setThreshold] = React.useState('');
  const [deposit, setDeposit] = React.useState('');
  const [error, setError] = React.useState('');

  const canManage = auth?.role === 'admin' || auth?.role === 'manager';

  const load = () => {
    if (auth && id) {
      getAccountOpening(auth.token, Number(id))
        .then(setOpening)
        .catch(() => setError('Failed to load request'));
    }
  };

  React.useEffect(load, [auth, id]);

  const totalDeposits = opening?.deposits.reduce((s, d) => s + d, 0) || 0;

  const handleApprove = async () => {
    if (!auth || !id) return;
    try {
      const req = await approveAccountOpening(auth.token, Number(id));
      setOpening(req);
      setError('');
    } catch {
      setError('Failed to approve request');
    }
  };

  const handleOpen = async () => {
    if (!auth || !id) return;
    try {
      const req = await openDepositAccount(auth.token, Number(id), {
        account_number: accountNumber,
        deposit_threshold: Number(threshold),
      });
      setOpening(req);
      setAccountNumber('');
      setThreshold('');
    } catch {
      setError('Failed to open account');
    }
  };

  const handleDeposit = async () => {
    if (!auth || !id) return;
    try {
      const req = await recordAccountDeposit(auth.token, Number(id), Number(deposit));
      setOpening(req);
      setDeposit('');
    } catch {
      setError('Failed to record deposit');
    }
  };

  if (!opening) return <div>{error || 'Loading...'}</div>;

  const canOpenAccount =
    opening.status === 'manager_approved' ||
    opening.status === 'in_progress' ||
    opening.status === 'completed';

  return (
    <div>
      <h2>Deposit Request {opening.id}</h2>
      <p>Realtor: {opening.realtor}</p>
      <p>Status: {opening.status}</p>

      {canManage && opening.status === 'submitted' && (
        <div>
          <h3>Manager Approval</h3>
          <p>Approve this request to begin account setup.</p>
          <button type="button" onClick={handleApprove}>
            Approve for Processing
          </button>
        </div>
      )}

      {!canManage && opening.status === 'submitted' && (
        <p>This deposit request is awaiting manager approval.</p>
      )}

      {canManage && !opening.account_number && (
        <div>
          <h3>Open Account</h3>
          <input
            placeholder="Account Number"
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
          />
          <input
            placeholder="Deposit Threshold"
            type="number"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
          />
          <button
            onClick={handleOpen}
            disabled={!accountNumber || !threshold || !canOpenAccount}
          >
            Save
          </button>
        </div>
      )}

      {opening.account_number && (
        <div>
          <h3>Deposit Tracking</h3>
          <p>Account: {opening.account_number}</p>
          <p>
            Received {totalDeposits} / {opening.deposit_threshold}
          </p>
          {canManage && opening.status !== 'completed' && (
            <div>
              <input
                placeholder="Deposit Amount"
                type="number"
                value={deposit}
                onChange={e => setDeposit(e.target.value)}
              />
              <button onClick={handleDeposit} disabled={!deposit}>
                Record
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p>{error}</p>}
    </div>
  );
};

export default DepositDetail;
