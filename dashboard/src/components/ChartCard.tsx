import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartDatum {
  label: string;
  value: number;
}

interface BaseChartCardProps {
  title: string;
  description?: string;
  data: ChartDatum[];
  ariaLabel?: string;
  chartHeight?: number;
  valueLabel?: string;
}

interface ChartRenderContext {
  data: ChartDatum[];
  colors: string[];
  valueLabel: string;
}

type ChartRenderer = (ctx: ChartRenderContext) => React.ReactNode;

const COLORS = ['#4C51BF', '#48BB78', '#ED8936', '#3182CE', '#9F7AEA', '#F56565'];

const ChartCard: React.FC<BaseChartCardProps & { renderChart: ChartRenderer }> = ({
  title,
  description,
  data,
  ariaLabel,
  chartHeight = 260,
  valueLabel = 'Value',
  renderChart,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(400);

  React.useEffect(() => {
    const updateSize = () => {
      const nextWidth = containerRef.current?.clientWidth;
      if (nextWidth && nextWidth !== width) {
        setWidth(nextWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [width]);

  const chartAria = ariaLabel ?? `${title} visualisation`;

  return (
    <section className="chart-card">
      <header className="chart-card__header">
        <h3>{title}</h3>
        {description && <p className="chart-card__description">{description}</p>}
      </header>
      <div className="chart-card__body">
        <div
          className="chart-card__visual"
          role="img"
          aria-label={chartAria}
          ref={containerRef}
          style={{ width: '100%' }}
        >
          {data.length > 0 ? (
            <ResponsiveContainer width={width} height={chartHeight}>
              {renderChart({ data, colors: COLORS, valueLabel })}
            </ResponsiveContainer>
          ) : (
            <p className="chart-card__empty" role="status">
              No data available
            </p>
          )}
        </div>
        {data.length > 0 && (
          <table className="chart-card__table">
            <caption className="visually-hidden">{`${title} data table`}</caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((datum) => (
                <tr key={datum.label}>
                  <td>{datum.label}</td>
                  <td>{datum.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export const BarChartCard: React.FC<BaseChartCardProps> = (props) => (
  <ChartCard
    {...props}
    renderChart={({ data, colors, valueLabel }) => (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" interval={0} angle={data.length > 3 ? -20 : 0} textAnchor={data.length > 3 ? 'end' : 'middle'} height={data.length > 3 ? 80 : undefined} />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value: number) => value.toLocaleString()} labelFormatter={(label) => `${label}`} />
        <Legend />
        <Bar dataKey="value" name={valueLabel}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    )}
  />
);

export const LineChartCard: React.FC<BaseChartCardProps> = (props) => (
  <ChartCard
    {...props}
    renderChart={({ data, colors, valueLabel }) => (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" interval={0} angle={data.length > 4 ? -20 : 0} textAnchor={data.length > 4 ? 'end' : 'middle'} height={data.length > 4 ? 80 : undefined} />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value: number) => value.toLocaleString()} labelFormatter={(label) => `${label}`} />
        <Legend />
        <Line type="monotone" dataKey="value" name={valueLabel} stroke={colors[0]} strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    )}
  />
);

export const PieChartCard: React.FC<BaseChartCardProps> = (props) => (
  <ChartCard
    {...props}
    renderChart={({ data, colors, valueLabel }) => (
      <PieChart>
        <Tooltip formatter={(value: number, _name, payload) => [value.toLocaleString(), payload?.payload?.label]} />
        <Legend />
        <Pie data={data} dataKey="value" nameKey="label" label={({ name, value }) => `${name}: ${value}`}> 
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    )}
  />
);

export const toChartData = (record: Record<string, number> | null | undefined): ChartDatum[] => {
  if (!record) return [];
  return Object.entries(record)
    .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
    .map(([label, value]) => ({ label: formatLabel(label), value }));
};

const formatLabel = (label: string) =>
  label
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default ChartCard;

