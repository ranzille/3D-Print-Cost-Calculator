import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CostBreakdown } from '../types';
import { COLORS } from '../constants';

interface SummaryChartProps {
  data: CostBreakdown;
  currency: (val: number) => string;
}

export const SummaryChart: React.FC<SummaryChartProps> = ({ data, currency }) => {
  // Guard against undefined data
  if (!data) return null;

  const chartData = [
    { name: 'Material', value: data.material || 0, color: COLORS.material },
    { name: 'Labor', value: data.labor || 0, color: COLORS.labor },
    { name: 'Energy/Machine', value: (data.energy || 0) + (data.depreciation || 0), color: COLORS.energy },
    { name: 'Overhead/Risk', value: (data.failureRisk || 0) + (data.extras || 0), color: COLORS.overhead },
    { name: 'Profit', value: data.profit || 0, color: COLORS.profit },
  ].filter(d => d.value > 0);

  const marginPercent = data.finalPrice > 0 
    ? ((data.profit / data.finalPrice) * 100).toFixed(1) 
    : '0';

  return (
    <div className="h-48 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => currency(value)}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Margin</span>
        <span className="text-xl font-extrabold text-brand-600">{marginPercent}%</span>
      </div>
    </div>
  );
};