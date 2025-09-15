import React from 'react';
import { useAuth } from '../auth';
import { getDashboard, getAuditLog } from '../api';

const ComplianceDashboard: React.FC = () => {
  const { auth } = useAuth();
  const [data, setData] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [filters, setFilters] = React.useState({ start: '', end: '', user: '', action: '' });

  React.useEffect(() => {
    if (auth) {
      getDashboard(auth.token).then(setData).catch(console.error);
      fetchLogs();
    }
  }, [auth]);

  const fetchLogs = () => {
    if (!auth) return;
    const params: any = {};
    if (filters.start) params.start = filters.start;
    if (filters.end) params.end = filters.end;
    if (filters.user) params.user = filters.user;
    if (filters.action) params.action = filters.action;
    getAuditLog(auth.token, params).then(setLogs).catch(console.error);
  };

  if (!auth) return null;

  const exportReport = (report: string, format: string) => {
    window.location.href = `/reports/${report}?format=${format}`;
  };

  return (
    <div>
      <h2>Compliance Dashboard</h2>
      {data && (
        <div>
          <p>Total Deposits: {data.deposits}</p>
          <p>Loans Approved: {data.loan_approvals?.approved || 0}</p>
          <p>Loans Rejected: {data.loan_approvals?.rejected || 0}</p>
          <button onClick={() => exportReport('properties', 'csv')}>Export Properties CSV</button>
          <button onClick={() => exportReport('properties', 'excel')}>Export Properties Excel</button>
          <button onClick={() => exportReport('mandates', 'csv')}>Export Mandates CSV</button>
          <button onClick={() => exportReport('mandates', 'excel')}>Export Mandates Excel</button>
          <button onClick={() => exportReport('loans', 'csv')}>Export Loans CSV</button>
          <button onClick={() => exportReport('loans', 'excel')}>Export Loans Excel</button>
        </div>
      )}
      <h3>Audit Log</h3>
      <div>
        <input
          placeholder="User"
          value={filters.user}
          onChange={e => setFilters({ ...filters, user: e.target.value })}
        />
        <input
          placeholder="Action"
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
        />
        <input
          type="date"
          value={filters.start}
          onChange={e => setFilters({ ...filters, start: e.target.value })}
        />
        <input
          type="date"
          value={filters.end}
          onChange={e => setFilters({ ...filters, end: e.target.value })}
        />
        <button onClick={fetchLogs}>Filter</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i}>
              <td>{l.timestamp}</td>
              <td>{l.user}</td>
              <td>{l.action}</td>
              <td>{l.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComplianceDashboard;
