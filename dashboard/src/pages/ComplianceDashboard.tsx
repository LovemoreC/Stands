import React from 'react';
import { useAuth } from '../auth';
import { downloadReport, getAuditLog, getDashboard } from '../api';
import { BarChartCard, LineChartCard, PieChartCard, toChartData } from '../components/ChartCard';

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

  const inventoryData = React.useMemo(() => toChartData(data?.property_status), [data?.property_status]);
  const mandateData = React.useMemo(() => toChartData(data?.mandates), [data?.mandates]);
  const depositData = React.useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.deposit_trend)) {
      return data.deposit_trend
        .filter((point: any) => point && typeof point.value === 'number' && point.label)
        .map((point: any) => ({ label: String(point.label), value: point.value }));
    }
    if (data.deposits_breakdown && typeof data.deposits_breakdown === 'object') {
      return toChartData(data.deposits_breakdown as Record<string, number>);
    }
    if (typeof data?.deposits === 'number') {
      return [{ label: 'Total Deposits', value: data.deposits }];
    }
    return [];
  }, [data]);
  const loanData = React.useMemo(() => toChartData(data?.loan_approvals), [data?.loan_approvals]);

  return (
    <div>
      <h2>Compliance Dashboard</h2>
      <div className="chart-grid" role="presentation">
        {depositData.length > 0 && (
          <LineChartCard
            title="Deposit oversight"
            description="Captured deposits segmented by reporting period"
            data={depositData}
            valueLabel="Deposits"
          />
        )}
        {loanData.length > 0 && (
          <BarChartCard
            title="Loan approvals vs rejections"
            description="Decision outcomes across compliance reviews"
            data={loanData}
            valueLabel="Applications"
          />
        )}
        {mandateData.length > 0 && (
          <PieChartCard
            title="Mandate statuses"
            description="Mandate health for monitored accounts"
            data={mandateData}
            valueLabel="Mandates"
          />
        )}
        {inventoryData.length > 0 && (
          <BarChartCard
            title="Inventory snapshot"
            description="Properties requiring compliance oversight"
            data={inventoryData}
            valueLabel="Properties"
          />
        )}
      </div>
      {data && (
        <div className="chart-actions">
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
