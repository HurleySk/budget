import { useRef, useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
// ResponsiveContainer removed - we manage dimensions manually to avoid width(-1) warnings
import { format } from 'date-fns';
import type { ProjectionEntry } from '../types';
import { formatCurrency } from '../calculations';

// Chart colors from our design system
const CHART_COLORS = {
  afterIncome: '#486581',    // primary-600
  afterExpenses: '#d97706',  // warning-600
  afterBaseline: '#243b53',  // primary-800
  goal: '#27ab83',           // accent-500
  grid: '#e7e5e4',           // neutral-200
  axis: '#78716c',           // neutral-500
};

interface ProjectionChartProps {
  data: ProjectionEntry[];
  savingsGoal: number;
}

export function ProjectionChart({ data, savingsGoal }: ProjectionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Manage dimensions manually to avoid ResponsiveContainer measurement issues
  useEffect(() => {
    let mounted = true;

    const updateDimensions = () => {
      if (!mounted || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    };

    // Double rAF ensures we're past the browser's paint cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(updateDimensions);
    });

    // ResizeObserver for responsive updates
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, []);

  // Memoize chart data transformation
  const chartData = useMemo(() => data.map((entry) => ({
    date: format(entry.date, 'MMM d'),
    fullDate: format(entry.date, 'MMM d, yyyy'),
    afterIncome: Math.round(entry.balanceAfterIncome * 100) / 100,
    afterExpenses: Math.round(entry.balanceAfterExpenses * 100) / 100,
    afterBaseline: Math.round(entry.balanceAfterBaseline * 100) / 100,
  })), [data]);

  // Calculate domain for Y axis
  const { minValue, maxValue, padding } = useMemo(() => {
    const allValues = data.flatMap((d) => [
      d.balanceAfterIncome,
      d.balanceAfterExpenses,
      d.balanceAfterBaseline,
    ]);
    const min = Math.min(...allValues, 0);
    const max = Math.max(...allValues, savingsGoal);
    return { minValue: min, maxValue: max, padding: (max - min) * 0.1 };
  }, [data, savingsGoal]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="text-neutral-500">Enter your budget details to see projections</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm overflow-hidden">
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-neutral-100">
        <h3 className="text-base font-semibold text-primary-800">Balance Projection</h3>
      </div>
      <div className="p-3 md:p-4">
        {/* Responsive height container - wait for dimensions before rendering chart */}
        <div
          ref={containerRef}
          className="h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px]"
        >
          {dimensions && (
            <LineChart
              width={dimensions.width}
              height={dimensions.height}
              data={chartData}
              margin={{ top: 10, right: 10, left: -5, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_COLORS.grid}
                strokeOpacity={0.6}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.grid }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[Math.floor(minValue - padding), Math.ceil(maxValue + padding)]}
                tickFormatter={(value) =>
                  value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                }
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                width={50}
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
                  border: 'none',
                  borderRadius: '10px',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                  padding: '10px 14px',
                  fontSize: '13px',
                }}
                itemStyle={{
                  padding: '2px 0',
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: '#243b53',
                  marginBottom: '6px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #e7e5e4',
                }}
                cursor={{
                  stroke: '#9fb3c8',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
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
                wrapperStyle={{
                  paddingTop: '12px',
                  fontSize: '12px',
                }}
              />

              {/* Goal reference line */}
              {savingsGoal > 0 && (
                <ReferenceLine
                  y={savingsGoal}
                  stroke={CHART_COLORS.goal}
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  label={{
                    value: `Goal: ${formatCurrency(savingsGoal)}`,
                    position: 'insideTopRight',
                    fill: CHART_COLORS.goal,
                    fontSize: 11,
                    fontWeight: 600,
                    offset: 8,
                  }}
                />
              )}

              {/* Balance lines - using stepAfter to show discrete changes at pay period boundaries */}
              <Line
                type="stepAfter"
                dataKey="afterIncome"
                stroke={CHART_COLORS.afterIncome}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: CHART_COLORS.afterIncome,
                  stroke: 'white',
                  strokeWidth: 2,
                }}
              />
              <Line
                type="stepAfter"
                dataKey="afterExpenses"
                stroke={CHART_COLORS.afterExpenses}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: CHART_COLORS.afterExpenses,
                  stroke: 'white',
                  strokeWidth: 2,
                }}
              />
              <Line
                type="stepAfter"
                dataKey="afterBaseline"
                stroke={CHART_COLORS.afterBaseline}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: CHART_COLORS.afterBaseline,
                  stroke: 'white',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          )}
        </div>
      </div>
    </div>
  );
}
