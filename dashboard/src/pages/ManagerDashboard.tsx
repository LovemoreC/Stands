import React from 'react';
import { useAuth } from '../auth';
import { downloadReport, getDashboard } from '../api';
import { BarChartCard, LineChartCard, PieChartCard, toChartData } from '../components/ChartCard';

interface QueueRow {
  id: string;
  label: string;
  submittedBy?: string;
  submittedAt?: string;
  status?: string;
  count?: number;
}

const ManagerDashboard: React.FC = () => {
  const { auth } = useAuth();
  const [data, setData] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!auth) return;
    setIsLoading(true);
    getDashboard(auth.token)
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [auth]);

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
    if (data.deposits_breakdown && typeof data.deposits_breakdown === 'object') {
      return toChartData(data.deposits_breakdown as Record<string, number>);
    }
    if (typeof data.deposits === 'number') {
      return [{ label: 'Total Deposits', value: data.deposits }];
    }
    return [];
  }, [data]);

  const queueRows = React.useMemo(() => buildQueue(data?.validation_queue ?? data?.validation_queues), [data]);

  if (!auth) return null;

  return (
    <div>
      <h2>Manager Dashboard</h2>
      <div className="chart-grid" role="presentation">
        {inventoryData.length > 0 && (
          <BarChartCard
            title="Inventory readiness"
            description="Properties awaiting validation and allocation"
            data={inventoryData}
            valueLabel="Properties"
          />
        )}
        {mandateData.length > 0 && (
          <PieChartCard
            title="Mandate status distribution"
            description="Mandates handled by your team"
            data={mandateData}
            valueLabel="Mandates"
          />
        )}
        {depositData.length > 0 && (
          <LineChartCard
            title="Deposit funnel"
            description="Deposits cleared during recent review cycles"
            data={depositData}
            valueLabel="Deposits"
          />
        )}
        {loanData.length > 0 && (
          <BarChartCard
            title="Loan pipeline"
            description="Loan applications requiring manager sign-off"
            data={loanData}
            valueLabel="Applications"
          />
        )}
      </div>
      <div className="chart-actions">
        <button onClick={() => exportReport('properties', 'csv')}>Export Properties CSV</button>
        <button onClick={() => exportReport('properties', 'excel')}>Export Properties Excel</button>
        <button onClick={() => exportReport('mandates', 'csv')}>Export Mandates CSV</button>
        <button onClick={() => exportReport('mandates', 'excel')}>Export Mandates Excel</button>
        <button onClick={() => exportReport('loans', 'csv')}>Export Loans CSV</button>
        <button onClick={() => exportReport('loans', 'excel')}>Export Loans Excel</button>
      </div>
      <section className="form-section">
        <div className="form-card">
          <h3 className="form-title">Validation queue</h3>
          {isLoading && <p>Loading queue…</p>}
          {!isLoading && queueRows.length === 0 && <p>No items waiting for validation.</p>}
          {queueRows.length > 0 && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead className="data-table__header">
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Submitted By</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Status</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {queueRows.map(row => (
                    <tr key={row.id}>
                      <td>{row.label}</td>
                      <td>{row.submittedBy ?? '—'}</td>
                      <td>{formatDate(row.submittedAt) ?? '—'}</td>
                      <td>{row.status ?? '—'}</td>
                      <td>{row.count != null ? row.count.toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const buildQueue = (queue: unknown): QueueRow[] => {
  if (!queue) return [];
  if (Array.isArray(queue)) {
    return queue.map((item, index) => {
      if (!item || typeof item !== 'object') {
        return {
          id: `item-${index}`,
          label: `Item ${index + 1}`,
        };
      }
      const record = item as Record<string, unknown>;
      const id = String(record.id ?? record.reference ?? index);
      const label = formatLabel(
        String(
          record.type ??
            record.queue ??
            record.category ??
            record.kind ??
            record.label ??
            record.name ??
            `Item ${index + 1}`,
        ),
      );
      return {
        id,
        label,
        submittedBy: typeof record.submitted_by === 'string'
          ? record.submitted_by
          : typeof record.user === 'string'
            ? record.user
            : undefined,
        submittedAt: typeof record.submitted_at === 'string'
          ? record.submitted_at
          : typeof record.created_at === 'string'
            ? record.created_at
            : undefined,
        status: typeof record.status === 'string'
          ? record.status
          : typeof record.state === 'string'
            ? record.state
            : undefined,
        count: typeof record.count === 'number' ? record.count : undefined,
      };
    });
  }
  if (typeof queue === 'object') {
    return Object.entries(queue as Record<string, unknown>).map(([key, value]) => ({
      id: key,
      label: formatLabel(key),
      status: typeof value === 'string' ? value : undefined,
      count: typeof value === 'number' ? value : undefined,
    }));
  }
  return [];
};

const formatLabel = (label: string) =>
  label
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const formatDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export default ManagerDashboard;

