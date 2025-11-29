import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { ProjectionEntry } from '../types';
import { formatCurrency } from '../calculations';

interface ProjectionChartProps {
  data: ProjectionEntry[];
  savingsGoal: number;
}

export function ProjectionChart({ data, savingsGoal }: ProjectionChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
        Enter your budget details to see projections
      </div>
    );
  }

  // Transform data for recharts
  const chartData = data.map((entry) => ({
    date: format(entry.date, 'MMM d'),
    fullDate: format(entry.date, 'MMM d, yyyy'),
    afterIncome: Math.round(entry.balanceAfterIncome * 100) / 100,
    afterExpenses: Math.round(entry.balanceAfterExpenses * 100) / 100,
    afterBaseline: Math.round(entry.balanceAfterBaseline * 100) / 100,
  }));

  // Calculate domain for Y axis
  const allValues = data.flatMap((d) => [
    d.balanceAfterIncome,
    d.balanceAfterExpenses,
    d.balanceAfterBaseline,
  ]);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, savingsGoal);
  const padding = (maxValue - minValue) * 0.1;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Balance Projection</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickMargin={10}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[Math.floor(minValue - padding), Math.ceil(maxValue + padding)]}
            tickFormatter={(value) =>
              value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
            }
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'afterIncome'
                ? 'After Income'
                : name === 'afterExpenses'
                ? 'After Expenses'
                : 'After Baseline',
            ]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullDate;
              }
              return label;
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
          <Legend
            formatter={(value) =>
              value === 'afterIncome'
                ? 'After Income'
                : value === 'afterExpenses'
                ? 'After Expenses'
                : 'After Baseline'
            }
          />

          {/* Goal reference line */}
          {savingsGoal > 0 && (
            <ReferenceLine
              y={savingsGoal}
              stroke="#10b981"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Goal: ${formatCurrency(savingsGoal)}`,
                position: 'right',
                fill: '#10b981',
                fontSize: 12,
              }}
            />
          )}

          {/* Balance lines - using stepAfter to show discrete changes at pay period boundaries */}
          {/* Different stroke patterns ensure lines are distinguishable even when values overlap */}
          <Line
            type="stepAfter"
            dataKey="afterIncome"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2563eb' }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="stepAfter"
            dataKey="afterExpenses"
            stroke="#d97706"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={{ r: 3, fill: '#d97706', strokeWidth: 2, stroke: '#d97706' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="stepAfter"
            dataKey="afterBaseline"
            stroke="#9333ea"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={{ r: 3, fill: '#9333ea', strokeWidth: 2, stroke: '#9333ea' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
