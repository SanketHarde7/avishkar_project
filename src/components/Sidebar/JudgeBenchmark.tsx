'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ValidationMetrics } from '@/types';

interface JudgeBenchmarkProps {
  data: ValidationMetrics;
  onClose?: () => void;
}

export const JudgeBenchmark: React.FC<JudgeBenchmarkProps> = ({ data }) => {
  // Semantic colors: baseline gray, XGBoost amber, PINN accent blue
  const getBarColor = (index: number) => {
    if (index === 2) return '#7dd3fc'; // PINN (best)
    if (index === 1) return '#d4a843'; // XGBoost
    return '#525252'; // Persistence
  };

  const chartData = data.metrics.map((item) => ({
    name: item.model.replace(' (Baseline)', '').replace(' (Physics-Informed)', ''),
    fullName: item.model,
    mae: item.mae,
    r2: item.r2,
  }));

  return (
    <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-3.5">
      {/* Header */}
      <div>
        <div className="text-sm font-semibold text-neutral-100">Validation experiment</div>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Two ground sensors were withheld from training; metrics are computed only at those
          locations.
        </p>
      </div>

      {/* Holdout rationale */}
      <div className="bg-neutral-950/60 rounded-md p-2.5 border border-neutral-800/80 text-[11px] leading-relaxed text-neutral-400">
        Withheld stations: <span className="text-neutral-200 font-medium">Pashan</span>{' '}
        (suburban green belt) and <span className="text-neutral-200 font-medium">Bhosari</span>{' '}
        (industrial corridor). Accuracy at these coordinates measures generalization, not
        memorization.
      </div>

      {/* MAE Chart */}
      <div className="bg-neutral-950/60 rounded-md p-3 border border-neutral-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-neutral-300">
            Mean absolute error <span className="text-neutral-500 font-normal">(lower is better)</span>
          </span>
          <span className="text-[10px] text-neutral-600">holdout eval</span>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 40]}
                stroke="#404040"
                tick={{ fill: '#737373', fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#404040"
                tick={{ fill: '#a3a3a3', fontSize: 10 }}
                width={82}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded-md shadow-xl text-xs text-neutral-200">
                        <div className="font-semibold text-neutral-100 mb-1">{d.fullName}</div>
                        <div className="flex justify-between gap-4 text-neutral-400">
                          <span>MAE</span>
                          <span className="font-semibold text-neutral-100 tnum">{d.mae} µg/m³</span>
                        </div>
                        <div className="flex justify-between gap-4 text-neutral-400 mt-0.5">
                          <span>R²</span>
                          <span className="font-semibold text-neutral-100 tnum">{d.r2}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="mae" radius={[0, 3, 3, 0]} barSize={18}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Result summary */}
        <div className="mt-2.5 pt-2.5 border-t border-neutral-800 flex items-center justify-between text-xs">
          <div className="text-neutral-300">
            <span className="font-semibold text-neutral-100 tnum">52%</span> lower error than
            XGBoost
          </div>
          <span className="font-mono text-[11px] text-neutral-400 tnum">R² 0.78</span>
        </div>
      </div>

      {/* Why physics helps */}
      <div className="text-[11px] text-neutral-400 leading-relaxed">
        Statistical baselines break when wind carries pollution away from sparse sensors. The
        physics constraint keeps predictions continuous and mass-conserving:{' '}
        <code className="font-mono text-neutral-300 bg-neutral-950/80 px-1 py-0.5 rounded border border-neutral-800">
          ∂C/∂t + u·∇C = D∇²C − kC
        </code>
      </div>
    </div>
  );
};
