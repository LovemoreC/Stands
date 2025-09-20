import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChartCard, LineChartCard, PieChartCard, toChartData } from '../ChartCard';

describe('shared chart components', () => {
  const sampleData = [
    { label: 'Available', value: 12 },
    { label: 'Reserved', value: 5 },
    { label: 'Sold', value: 7 },
  ];

  it('renders a bar chart with a data table fallback', () => {
    const { asFragment } = render(
      <BarChartCard
        title="Inventory overview"
        description="Distribution of inventory"
        data={sampleData}
        valueLabel="Properties"
      />,
    );

    expect(screen.getByRole('img', { name: /inventory overview/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders a line chart', () => {
    render(
      <LineChartCard
        title="Deposit performance"
        description="Weekly deposits"
        data={sampleData}
        valueLabel="Deposits"
      />,
    );

    expect(screen.getByRole('img', { name: /deposit performance/i })).toBeInTheDocument();
  });

  it('renders a pie chart', () => {
    render(
      <PieChartCard
        title="Mandate statuses"
        description="Breakdown of mandate statuses"
        data={sampleData}
        valueLabel="Mandates"
      />,
    );

    expect(screen.getByRole('img', { name: /mandate statuses/i })).toBeInTheDocument();
  });

  it('converts records to chart data', () => {
    const chartData = toChartData({ pending_review: 3, approved: 4 });
    expect(chartData).toEqual([
      { label: 'Pending Review', value: 3 },
      { label: 'Approved', value: 4 },
    ]);
  });
});

