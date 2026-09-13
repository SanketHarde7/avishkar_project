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
  // Semantic colors: baseline dark gray, XGBoost mid gray, PINN signature brass
  const getBarColor = (index: number) => {
    if (index === 2) return '#c9a24b'; // PINN (best / signature accent)
    if (index === 1) return '#6b6f77'; // XGBoost (neutral baseline)
    return '#3a3d44'; // Global Mean Baseline (subdued baseline)
  };

  const chartData = data.metrics.map((item) => ({
    name: item.model
      .replace(' (Baseline)', '')
      .replace(' Baseline', '')
      .replace(' (Physics-Informed)', ''),
    fullName: item.model,
    mae: item.mae,
    r2: item.r2,
  }));

  const maxMae = Math.max(...chartData.map((d) => d.mae), 5);
  const domainMax = Math.ceil(maxMae + 1);
  const pinnMetric = data.metrics.find((m) => m.model.toLowerCase().includes('pinn'));

  return (
    <div className="bg-surface rounded-[2px] p-4 border border-border space-y-3.5">
      {/* Header */}
      <div>
        <div className="text-sm font-semibold text-text-primary">Validation experiment</div>
        <p className="text-[11px] text-text-muted mt-0.5">
          Two ground sensors were withheld from training; metrics are computed only at those
          locations.
        </p>
      </div>

      {/* Holdout rationale */}
      <div className="bg-surface-raised rounded-[2px] p-2.5 border border-border text-[11px] leading-relaxed text-text-secondary">
        Withheld stations: <span className="text-text-primary font-medium">Pashan</span>{' '}
        (suburban green belt) and <span className="text-text-primary font-medium">Bhosari</span>{' '}
        (industrial corridor). Accuracy at these coordinates measures generalization, not
        memorization.
      </div>

      {/* MAE Chart */}
      <div className="bg-surface-raised rounded-[2px] p-3 border border-border">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-text-primary">
            Mean absolute error <span className="text-text-muted font-normal">(lower is better)</span>
          </span>
          <span className="text-[10px] text-text-muted">holdout eval</span>
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
                domain={[0, domainMax]}
                stroke="#2b2d33"
                tick={{ fill: '#6b6f77', fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#2b2d33"
                tick={{ fill: '#9a9ea6', fontSize: 10 }}
                width={82}
              />
              <Tooltip
                cursor={{ fill: 'rgba(201, 162, 75, 0.04)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface border border-border-strong p-2.5 rounded-[2px] shadow-none text-xs text-text-primary">
                        <div className="font-semibold text-text-primary mb-1">{d.fullName}</div>
                        <div className="flex justify-between gap-4 text-text-muted">
                          <span>MAE</span>
                          <span className="font-semibold text-text-primary tnum">{d.mae} µg/m³</span>
                        </div>
                        <div className="flex justify-between gap-4 text-text-muted mt-0.5">
                          <span>R²</span>
                          <span className="font-semibold text-text-primary tnum">{d.r2}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="mae" radius={[0, 2, 2, 0]} barSize={18}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Result summary */}
        <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between text-xs">
          <div className="text-text-secondary">
            PINN MAE: <span className="font-semibold text-accent tnum">{pinnMetric?.mae ?? 4.9} µg/m³</span>
          </div>
          <span className="font-mono text-[11px] text-text-muted tnum">
            R² {pinnMetric?.r2 ?? -0.484}
          </span>
        </div>
      </div>

      {/* Why physics helps & LOOCV context */}
      <div className="text-[11px] text-text-secondary leading-relaxed">
        Single 2-station split is noisy (low local test variance). Across all 12 stations in full cross-validation (see <span className="text-text-primary font-medium">Under the Hood</span>), PINN achieves lowest city-wide error (5.24 µg/m³ vs 5.77 µg/m³ baseline):{' '}
        <code className="font-mono text-text-primary bg-surface px-1 py-0.5 rounded-[2px] border border-border">
          ∂C/∂t + u·∇C = D∇²C − kC
        </code>
      </div>
    </div>
  );
};
