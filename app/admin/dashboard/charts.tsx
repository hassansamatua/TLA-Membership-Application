'use client';

import { useState, useEffect } from 'react';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ChartProps {
  title: string;
  data: any;
  type: 'bar' | 'pie' | 'line' | 'doughnut';
  height?: number;
}

export function ChartComponent({ title, data, type, height = 300 }: ChartProps) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: title },
    },
  };

  return (
    <div style={{ height: `${height}px`, position: 'relative' }} className="bg-white p-4 rounded-lg shadow">
      {type === 'bar' && <Bar data={data} options={chartOptions} />}
      {type === 'pie' && <Pie data={data} options={chartOptions} />}
      {type === 'line' && <Line data={data} options={chartOptions} />}
      {type === 'doughnut' && <Doughnut data={data} options={chartOptions} />}
    </div>
  );
}

export async function fetchReportChartData(reportType: string) {
  try {
    const response = await fetch(`/api/admin/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        reportType: reportType,
      }),
    });

    if (!response.ok) throw new Error('Failed to fetch report data');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching ${reportType} report:`, error);
    return [];
  }
}

export function processDataForChart(data: any[], field: string, type: 'bar' | 'pie' | 'line' | 'doughnut') {
  if (!data || data.length === 0) return null;

  const fieldValues = data.map(row => row[field]);
  const uniqueValues = [...new Set(fieldValues)].filter(v => v !== null && v !== undefined);
  const counts = uniqueValues.map(val => fieldValues.filter(v => v === val).length);

  const colors = [
    'rgb(75, 192, 192)',
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 206, 86)',
    'rgb(153, 102, 255)',
    'rgb(255, 159, 64)',
    'rgb(199, 199, 199)',
    'rgb(83, 102, 255)',
  ];

  const baseColors = colors.slice(0, Math.max(uniqueValues.length, colors.length));

  if (type === 'pie' || type === 'doughnut') {
    return {
      labels: uniqueValues.map(v => String(v)),
      datasets: [
        {
          label: field,
          data: counts,
          backgroundColor: baseColors,
          borderColor: baseColors.map(c => c.replace('rgb', 'rgba').replace(')', ', 1)')),
          borderWidth: 2,
        },
      ],
    };
  }

  if (type === 'bar') {
    return {
      labels: uniqueValues.map(v => String(v)),
      datasets: [
        {
          label: `Count by ${field}`,
          data: counts,
          backgroundColor: baseColors[0],
          borderColor: baseColors[0].replace('rgb', 'rgba').replace(')', ', 1)'),
          borderWidth: 1,
        },
      ],
    };
  }

  // Line chart
  return {
    labels: uniqueValues.map(v => String(v)),
    datasets: [
      {
        label: `Trend: ${field}`,
        data: counts,
        borderColor: baseColors[0],
        backgroundColor: baseColors[0].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };
}
