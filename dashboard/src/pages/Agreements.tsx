import React from 'react';
import { useAuth } from '../auth';
import {
  AgreementRecord,
  downloadAgreement,
  getAgreements,
  uploadCustomerAgreementFile,
  uploadManagerAgreementFile,
} from '../api';

const Agreements: React.FC = () => {
  const { auth } = useAuth();
  const [agreements, setAgreements] = React.useState<AgreementRecord[]>([]);
  const [error, setError] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [customerFiles, setCustomerFiles] = React.useState<Record<number, File | null>>({});
  const [managerFiles, setManagerFiles] = React.useState<Record<number, File | null>>({});
  const isManager = auth?.role === 'manager' || auth?.role === 'admin';

  const loadAgreements = React.useCallback(() => {
    if (!auth) return;
    setIsLoading(true);
    getAgreements(auth.token)
      .then(data => {
        setAgreements(data);
        setError('');
      })
      .catch(() => setError('Unable to load agreements.'))
      .finally(() => setIsLoading(false));
  }, [auth]);

  React.useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  const updateAgreement = (record: AgreementRecord) => {
    setAgreements(prev => prev.map(item => (item.id === record.id ? record : item)));
  };

  const handleDownload = async (id: number) => {
    if (!auth) return;
    try {
      const { blob, filename } = await downloadAgreement(auth.token, id);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError('Failed to download agreement.');
    }
  };

  const handleCustomerUpload = async (id: number) => {
    if (!auth) return;
    const file = customerFiles[id];
    if (!file) {
      setError('Select a file before uploading.');
      return;
    }
    try {
      const updated = await uploadCustomerAgreementFile(auth.token, id, file);
      updateAgreement(updated);
      setStatusMessage('Customer-reviewed agreement uploaded.');
      setError('');
      setCustomerFiles(prev => ({ ...prev, [id]: null }));
    } catch (err) {
      setError('Failed to upload customer-reviewed agreement.');
    }
  };

  const handleManagerUpload = async (id: number) => {
    if (!auth || !isManager) return;
    const file = managerFiles[id];
    if (!file) {
      setError('Select a final agreement before uploading.');
      return;
    }
    try {
      const updated = await uploadManagerAgreementFile(auth.token, id, file);
      updateAgreement(updated);
      setStatusMessage('Final signed agreement uploaded.');
      setError('');
      setManagerFiles(prev => ({ ...prev, [id]: null }));
    } catch (err) {
      setError('Failed to upload final agreement.');
    }
  };

  const renderAuditLog = (log: string[]) => {
    if (log.length === 0) return <span>—</span>;
    return (
      <details>
        <summary>History</summary>
        <ul>
          {log.map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ul>
      </details>
    );
  };

  return (
    <div>
      <h2>Agreements Workspace</h2>
      {statusMessage && <p className="status-message">{statusMessage}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {isLoading && <p>Loading agreements…</p>}
      {!isLoading && agreements.length === 0 && <p>No agreements available.</p>}
      {agreements.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead className="data-table__header">
              <tr>
                <th scope="col">Agreement</th>
                <th scope="col">Property</th>
                <th scope="col">Status</th>
                <th scope="col">Audit Log</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map(agreement => (
                <tr key={agreement.id}>
                  <td>#{agreement.id}</td>
                  <td>{agreement.property_id}</td>
                  <td>{agreement.status}</td>
                  <td>{renderAuditLog(agreement.audit_log)}</td>
                  <td>
                    <div className="action-group">
                      <button type="button" onClick={() => handleDownload(agreement.id)}>
                        Download Latest
                      </button>
                    </div>
                    <div className="action-group">
                      <label>
                        <span className="visually-hidden">Upload customer reviewed copy</span>
                        <input
                          type="file"
                          onChange={event =>
                            setCustomerFiles(prev => ({
                              ...prev,
                              [agreement.id]: event.target.files?.[0] ?? null,
                            }))
                          }
                        />
                      </label>
                      <button type="button" onClick={() => handleCustomerUpload(agreement.id)}>
                        Upload Customer Copy
                      </button>
                    </div>
                    {isManager && (
                      <div className="action-group">
                        <label>
                          <span className="visually-hidden">Upload final signed agreement</span>
                          <input
                            type="file"
                            onChange={event =>
                              setManagerFiles(prev => ({
                                ...prev,
                                [agreement.id]: event.target.files?.[0] ?? null,
                              }))
                            }
                          />
                        </label>
                        <button type="button" onClick={() => handleManagerUpload(agreement.id)}>
                          Upload Final Signed
                        </button>
                      </div>
                    )}
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

export default Agreements;
