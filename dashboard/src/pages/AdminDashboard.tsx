import React from 'react';
import { useAuth } from '../auth';
import { downloadReport, getDashboard } from '../api';
import { BarChartCard, LineChartCard, PieChartCard, toChartData } from '../components/ChartCard';

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

  const inventoryData = React.useMemo(() => toChartData(data?.property_status), [data?.property_status]);
  const mandateData = React.useMemo(() => toChartData(data?.mandates), [data?.mandates]);
  const loanData = React.useMemo(() => toChartData(data?.loan_approvals), [data?.loan_approvals]);
  const depositData = React.useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.deposit_trend)) {
      return data.deposit_trend
        .filter((point: any) => point && typeof point.value === 'number' && point.label)
        .map((point: any) => ({ label: String(point.label), value: point.value }));
    }
    if (typeof data.deposits === 'number') {
      return [{ label: 'Total Deposits', value: data.deposits }];
    }
    if (data.deposits_breakdown && typeof data.deposits_breakdown === 'object') {
      return toChartData(data.deposits_breakdown as Record<string, number>);
    }
    return [];
  }, [data]);

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="chart-grid" role="presentation">
        {inventoryData.length > 0 && (
          <div>
            <BarChartCard
              title="Inventory overview"
              description="Distribution of properties by lifecycle status"
              data={inventoryData}
              valueLabel="Properties"
            />
            <div className="chart-actions">
              <button onClick={() => exportReport('properties', 'csv')}>Export CSV</button>
              <button onClick={() => exportReport('properties', 'excel')}>Export Excel</button>
            </div>
          </div>
        )}
        {mandateData.length > 0 && (
          <div>
            <PieChartCard
              title="Mandate coverage"
              description="Active mandates grouped by status"
              data={mandateData}
              valueLabel="Mandates"
            />
            <div className="chart-actions">
              <button onClick={() => exportReport('mandates', 'csv')}>Export CSV</button>
              <button onClick={() => exportReport('mandates', 'excel')}>Export Excel</button>
            </div>
          </div>
        )}
        {depositData.length > 0 && (
          <LineChartCard
            title="Deposit performance"
            description="Snapshot of deposits ingested across the period"
            data={depositData}
            valueLabel="Deposits"
          />
        )}
        {loanData.length > 0 && (
          <div>
            <BarChartCard
              title="Loan decisions"
              description="Approvals and rejections for submitted loan applications"
              data={loanData}
              valueLabel="Applications"
            />
            <div className="chart-actions">
              <button onClick={() => exportReport('loans', 'csv')}>Export CSV</button>
              <button onClick={() => exportReport('loans', 'excel')}>Export Excel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
