'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Cpu, ShieldCheck, Activity, Layers, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchModelBenchmarks } from '@/lib/api';
import { ModelBenchmarkResponse, LoocvFoldRecord } from '@/types';

interface UnderTheHoodViewProps {
  onBackToMonitor: () => void;
}

interface MergedModelItem {
  model: string;
  shortName: string;
  category: string;
  mae: number;
  rmse: number;
  r2: number;
  loocvMae: number;
  physics: boolean;
  highlight: boolean;
  assessment: string;
}

function getShortName(modelName: string): string {
  if (modelName.includes('PINN')) return 'PINN (Ours)';
  if (modelName.includes('XGBoost')) return 'XGBoost';
  if (modelName.includes('Random Forest')) return 'Random Forest';
  if (modelName.includes('Global Mean')) return 'Global Mean';
  if (modelName.includes('Support Vector') || modelName.includes('SVR')) return 'SVR (RBF)';
  if (modelName.includes('Ridge')) return 'Ridge Reg.';
  if (modelName.includes('Neighbors') || modelName.includes('KNN')) return 'KNN (k=5)';
  return modelName;
}

export const UnderTheHoodView: React.FC<UnderTheHoodViewProps> = ({ onBackToMonitor }) => {
  const [benchmarkData, setBenchmarkData] = useState<ModelBenchmarkResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'loocvMae' | 'mae' | 'rmse'>('loocvMae');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModelBenchmarks();
      setBenchmarkData(data);
    } catch (err) {
      console.error('Failed to load benchmark models:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to benchmark backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Merge holdout metrics with LOOCV metrics dynamically
  const mergedModels: MergedModelItem[] = useMemo(() => {
    if (!benchmarkData?.multi_model?.models) return [];

    const loocvMap = new Map<string, number>();
    (benchmarkData.loocv?.average_metrics || []).forEach((am) => {
      const normKey = am.model.toLowerCase().replace(/[^a-z0-9]/g, '');
      loocvMap.set(normKey, am.mae);
    });

    const list = benchmarkData.multi_model.models.map((m) => {
      const normKey = m.model.toLowerCase().replace(/[^a-z0-9]/g, '');
      const loocvMae = loocvMap.get(normKey) ?? m.mae;
      const isPinn = m.model.toLowerCase().includes('pinn');
      return {
        model: m.model,
        shortName: getShortName(m.model),
        category: m.category,
        mae: m.mae,
        rmse: m.rmse,
        r2: m.r2,
        loocvMae,
        physics: m.physics_constrained,
        highlight: isPinn,
        assessment: m.description,
      };
    });

    // Keep PINN prominently at the top, then sort others by LOOCV MAE ascending
    return list.sort((a, b) => {
      if (a.highlight) return -1;
      if (b.highlight) return 1;
      return a.loocvMae - b.loocvMae;
    });
  }, [benchmarkData]);

  // Dynamic quick specs values
  const pinnModel = useMemo(() => mergedModels.find((m) => m.highlight) || mergedModels[0], [mergedModels]);
  const xgbModel = useMemo(() => mergedModels.find((m) => m.model.toLowerCase().includes('xgboost')), [mergedModels]);

  const loocvImprovementPct = useMemo(() => {
    if (!pinnModel || !xgbModel || xgbModel.loocvMae <= 0) return '0.0';
    const pct = ((xgbModel.loocvMae - pinnModel.loocvMae) / xgbModel.loocvMae) * 100;
    return pct.toFixed(1);
  }, [pinnModel, xgbModel]);

  const onnxLatency = benchmarkData?.loocv?.onnx_latency_ms ?? 0.05;
  const folds = benchmarkData?.loocv?.folds || [];

  const pinnWinCount = useMemo(() => {
    return folds.filter((f) => {
      const p = f.pinn_mae ?? 999;
      const x = f.xgb_mae ?? 999;
      const g = f.gm_mae ?? 999;
      return p <= x && p <= g;
    }).length;
  }, [folds]);

  const physicsParams = benchmarkData?.loocv?.physics_params;
  const diffCoeff = physicsParams?.diffusion_d ?? 0.15;
  const decayRate = physicsParams?.decay_k ?? 0.02;
  const lambdaPhys = physicsParams?.lambda_phys ?? 0.008;

  const maxActiveMetricValue = useMemo(() => {
    if (mergedModels.length === 0) return 8;
    const maxVal = Math.max(...mergedModels.map((m) => m[activeMetric] || 0));
    return Math.ceil(maxVal * 1.15);
  }, [mergedModels, activeMetric]);

  const getBarColor = (item: MergedModelItem) => {
    if (item.highlight) return '#c9a24b'; // Signature brass/gold for PINN
    if (item.category.includes('Trees') || item.category.includes('Learning')) return '#6b6f77';
    if (item.category.includes('Baseline')) return '#3a3d44';
    return '#4a4d55';
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-background text-text-primary p-6 space-y-6 flex flex-col justify-center items-center">
        <div className="flex items-center gap-3 text-accent animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-sm font-mono tracking-wider">Fetching live 12-fold LOOCV metrics from backend...</span>
        </div>
        <p className="text-xs text-text-muted">Loading empirical benchmark distributions for all 7 models...</p>
      </div>
    );
  }

  if (error || !benchmarkData) {
    return (
      <div className="w-full h-full bg-background text-text-primary p-6 flex flex-col justify-center items-center space-y-4">
        <div className="flex items-center gap-2 text-danger">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Backend Benchmark Data Unavailable</span>
        </div>
        <p className="text-xs text-text-muted max-w-md text-center">{error}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-accent text-background text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
          <button
            onClick={onBackToMonitor}
            className="px-3 py-1.5 rounded-[4px] bg-surface-raised border border-border text-text-secondary text-xs hover:text-text-primary transition-colors"
          >
            Back to Live Monitor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background text-text-primary overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMonitor}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-surface-raised border border-border hover:border-border-strong text-text-secondary hover:text-text-primary text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Live Monitor</span>
            </button>
            <span className="text-[10px] text-accent font-mono px-2 py-0.5 rounded-[2px] bg-accent-muted/40 border border-accent/40">
              Technical / Developer View
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary mt-2">
            Model Validation & Physics Constraint Architecture
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Rigorously evaluating PINN vs {mergedModels.length > 1 ? mergedModels.length - 1 : 6} standard ML & statistical baselines across {folds.length} monitoring stations in Pune.
          </p>
        </div>

        {/* Quick Specs Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-surface rounded-[2px] p-2.5 border border-border text-right">
            <div className="panel-label">LOOCV Gen. Error</div>
            <div className="text-base font-semibold text-accent tnum">
              {pinnModel ? pinnModel.loocvMae.toFixed(2) : '—'} µg/m³
            </div>
            <div className="text-[10px] text-text-muted">
              {loocvImprovementPct}% lower than XGBoost
            </div>
          </div>
          <div className="bg-surface rounded-[2px] p-2.5 border border-border text-right">
            <div className="panel-label">ONNX Latency</div>
            <div className="text-base font-semibold text-text-primary tnum">
              {onnxLatency < 0.1 ? '< 0.1 ms' : `${onnxLatency.toFixed(2)} ms`}
            </div>
            <div className="text-[10px] text-text-muted">Single-thread CPU</div>
          </div>
        </div>
      </div>

      {/* 1. Multi-Model Benchmark Comparison */}
      <div className="bg-surface rounded-[2px] p-5 border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="panel-label">Comprehensive Algorithm Comparison</div>
            <h3 className="text-base font-semibold text-text-primary mt-0.5">
              Why We Chose PINN Over Standard Classical & ML Models
            </h3>
            <p className="text-xs text-text-secondary">
              Pure machine learning models memorize station point clusters; PINN regularizes dispersion via 2D fluid physics.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center bg-surface-raised p-1 rounded-[6px] border border-border text-xs">
            <button
              onClick={() => setActiveMetric('loocvMae')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                activeMetric === 'loocvMae'
                  ? 'bg-surface text-accent border border-border-strong'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              LOOCV Spatial MAE
            </button>
            <button
              onClick={() => setActiveMetric('mae')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                activeMetric === 'mae'
                  ? 'bg-surface text-accent border border-border-strong'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Holdout MAE
            </button>
            <button
              onClick={() => setActiveMetric('rmse')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                activeMetric === 'rmse'
                  ? 'bg-surface text-accent border border-border-strong'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Holdout RMSE
            </button>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mergedModels}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, maxActiveMetricValue]}
                stroke="#2b2d33"
                tick={{ fill: '#6b6f77', fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                stroke="#2b2d33"
                tick={{ fill: '#9a9ea6', fontSize: 11 }}
                width={120}
              />
              <Tooltip
                cursor={{ fill: 'rgba(201, 162, 75, 0.04)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as MergedModelItem;
                    return (
                      <div className="bg-surface border border-border-strong p-3 rounded-[2px] text-xs text-text-primary space-y-1">
                        <div className="font-semibold text-text-primary">{d.model}</div>
                        <div className="text-[11px] text-text-muted">{d.category}</div>
                        <div className="pt-1.5 border-t border-border flex justify-between gap-4">
                          <span className="text-text-muted">LOOCV MAE:</span>
                          <span className="font-semibold text-accent tnum">{d.loocvMae.toFixed(2)} µg/m³</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-text-muted">Holdout MAE:</span>
                          <span className="font-semibold text-text-primary tnum">{d.mae.toFixed(2)} µg/m³</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-text-muted">Holdout R²:</span>
                          <span className="font-semibold text-text-primary tnum">{d.r2.toFixed(3)}</span>
                        </div>
                        <div className="pt-1 text-[11px] text-text-secondary italic max-w-xs leading-tight">
                          {d.assessment}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey={activeMetric} radius={[0, 3, 3, 0]} barSize={18}>
                {mergedModels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-text-muted font-medium">
                <th className="pb-2">Model Architecture</th>
                <th className="pb-2">Paradigm</th>
                <th className="pb-2 text-right">LOOCV MAE</th>
                <th className="pb-2 text-right">Holdout MAE</th>
                <th className="pb-2 text-right">Holdout R²</th>
                <th className="pb-2 text-center">Physics PDE</th>
                <th className="pb-2 pl-4">Failure Mode / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mergedModels.map((m) => (
                <tr
                  key={m.model}
                  className={m.highlight ? 'bg-accent-muted/20 font-medium' : 'hover:bg-surface-raised/40'}
                >
                  <td className="py-2.5 text-text-primary flex items-center gap-2">
                    {m.highlight && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    <span>{m.model}</span>
                  </td>
                  <td className="py-2.5 text-text-muted">{m.category}</td>
                  <td className={`py-2.5 text-right tnum ${m.highlight ? 'text-accent font-semibold' : 'text-text-secondary'}`}>
                    {m.loocvMae.toFixed(2)} µg/m³
                  </td>
                  <td className="py-2.5 text-right tnum text-text-secondary">{m.mae.toFixed(2)} µg/m³</td>
                  <td className="py-2.5 text-right tnum text-text-secondary">{m.r2.toFixed(3)}</td>
                  <td className="py-2.5 text-center">
                    {m.physics ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted/40 text-accent border border-accent/40 font-mono">
                        PDE Enforced
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-muted">None</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-4 text-[11px] text-text-secondary max-w-sm">
                    {m.assessment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Grid Layout: LOOCV Breakdown & Physics Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 12-Fold LOOCV Matrix */}
        <div className="bg-surface rounded-[2px] p-5 border border-border space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="panel-label">Spatial Cross-Validation</div>
              <h4 className="text-sm font-semibold text-text-primary mt-0.5">
                {folds.length}-Fold Leave-One-Out Station Breakdown
              </h4>
            </div>
            <span className="text-[10px] text-text-muted font-mono">{folds.length} Active Sensors</span>
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            In each fold, 1 ground sensor was entirely withheld from training to test how accurately the continuous field estimates unmonitored neighborhoods.
          </p>

          <div className="max-h-72 overflow-y-auto custom-scrollbar border border-border rounded-[2px]">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-surface-raised border-b border-border sticky top-0 text-text-muted">
                <tr>
                  <th className="py-1.5 px-2.5">Withheld Station</th>
                  <th className="py-1.5 px-2 text-right">Global Mean</th>
                  <th className="py-1.5 px-2 text-right">Spatial XGB</th>
                  <th className="py-1.5 px-2 text-right text-accent">PINN (Ours)</th>
                  <th className="py-1.5 px-2 text-center">Best</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {folds.map((row: LoocvFoldRecord) => {
                  const bestTag = row.best || (row.pinn_mae <= row.xgb_mae && row.pinn_mae <= row.gm_mae ? 'PINN' : row.xgb_mae <= row.gm_mae ? 'XGB' : 'GM');
                  return (
                    <tr key={row.station} className="hover:bg-surface-raised/40">
                      <td className="py-1.5 px-2.5 text-text-secondary font-medium">{row.station}</td>
                      <td className="py-1.5 px-2 text-right tnum text-text-muted">{row.gm_mae.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right tnum text-text-muted">{row.xgb_mae.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right tnum font-semibold text-accent">
                        {row.pinn_mae ? row.pinn_mae.toFixed(2) : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          bestTag === 'PINN'
                            ? 'bg-accent-muted/50 text-accent border border-accent/40 font-semibold'
                            : 'bg-surface-raised text-text-muted'
                        }`}>
                          {bestTag}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-text-muted text-right">
            PINN achieves lowest error in {pinnWinCount} of {folds.length} unmonitored locations.
          </div>
        </div>

        {/* Physics Formulation & Advection-Diffusion Math */}
        <div className="bg-surface rounded-[2px] p-5 border border-border space-y-4">
          <div>
            <div className="panel-label">Mathematical Formulation</div>
            <h4 className="text-sm font-semibold text-text-primary mt-0.5">
              2D Advection–Diffusion Partial Differential Equation
            </h4>
          </div>

          <div className="bg-surface-raised p-3.5 rounded-[2px] border border-border space-y-2">
            <div className="font-mono text-xs text-text-primary text-center py-2 bg-surface rounded-[2px] border border-border-strong">
              ∂C/∂t + u·(∂C/∂x) + v·(∂C/∂y) = D·(∂²C/∂x² + ∂²C/∂y²) − kC
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary font-mono pt-1">
              <div>
                <span className="text-text-muted">Advection (u, v):</span> Directional wind drift
              </div>
              <div>
                <span className="text-text-muted">Diffusion (D = {diffCoeff}):</span> Atmospheric spread
              </div>
              <div>
                <span className="text-text-muted">Decay (k = {decayRate}):</span> Particulate deposition
              </div>
              <div>
                <span className="text-text-muted">Residual Loss:</span> λ_phys = {lambdaPhys}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-text-secondary leading-relaxed">
            <div className="text-text-primary font-medium">Why Classical ML Models Degrade:</div>
            <p>
              When high winds blow emissions away from Pune&apos;s central monitoring cluster into the Hadapsar industrial corridor, tree-based models predict near-constant flat lines because they have no representation of continuous spatial flow.
            </p>
            <p>
              The PINN enforces the PDE residual as a loss regularizer using automatic differentiation. Even where zero sensors exist, mass must be conserved:
            </p>
            <div className="bg-surface-raised p-2 rounded border border-border text-[10px] font-mono text-text-muted">
              Loss = MSE_data(C_pred, C_sensor) + λ_phys · MSE_physics(Residual_PDE)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
