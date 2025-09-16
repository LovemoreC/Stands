import React from 'react';
import { useAuth } from '../auth';
import { downloadReport, getDashboard } from '../api';

const AdminDashboard: React.FC = () => {
  const { auth } = useAuth();
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    if (auth) {
      getDashboard(auth.token).then(setData).catch(console.error);
    }
  }, [auth]);

  if (!auth) return null;

  const exportReport = React.useCallback(
    async (report: string, format: string) => {
      if (!auth) return;
      let objectUrl: string | null = null;
      let link: HTMLAnchorElement | null = null;
      try {
        const blob = await downloadReport(auth.token, report, format);
        objectUrl = URL.createObjectURL(blob);
        const extension = format === 'excel' ? 'xlsx' : format;
        link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${report}.${extension}`;
        document.body.appendChild(link);
        link.click();
      } catch (error) {
        console.error('Failed to export report', error);
      } finally {
        if (link && document.body.contains(link)) {
          document.body.removeChild(link);
        }
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    },
    [auth],
  );

  return (
    <div>
      <h2>Dashboard</h2>
      {data?.property_status && (
        <div>
          <h3>Inventory</h3>
          <ul>
            {Object.entries(data.property_status).map(([k, v]) => (
              <li key={k}>{k}: {v as number}</li>
            ))}
          </ul>
          <button onClick={() => exportReport('properties', 'csv')}>Export CSV</button>
          <button onClick={() => exportReport('properties', 'excel')}>Export Excel</button>
        </div>
      )}
      {data?.mandates && (
        <div>
          <h3>Mandates</h3>
          <ul>
            {Object.entries(data.mandates).map(([k, v]) => (
              <li key={k}>{k}: {v as number}</li>
            ))}
          </ul>
          <button onClick={() => exportReport('mandates', 'csv')}>Export CSV</button>
          <button onClick={() => exportReport('mandates', 'excel')}>Export Excel</button>
        </div>
      )}
      {data?.deposits !== undefined && (
        <div>
          <h3>Deposits</h3>
          <p>Total Deposits: {data.deposits}</p>
        </div>
      )}
      {data?.loan_approvals && (
        <div>
          <h3>Loans</h3>
          <ul>
            <li>Approved: {data.loan_approvals.approved}</li>
            <li>Rejected: {data.loan_approvals.rejected}</li>
          </ul>
          <button onClick={() => exportReport('loans', 'csv')}>Export CSV</button>
          <button onClick={() => exportReport('loans', 'excel')}>Export Excel</button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
