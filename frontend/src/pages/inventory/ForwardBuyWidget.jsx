import React, { useState, useEffect } from 'react';
import { TrendingUp, ShieldAlert, DollarSign, Package, Layers, Info } from 'lucide-react';

export default function ForwardBuyWidget({ productId = 'SKU-001' }) {
  const [data, setData] = useState(null);
  const [deltaPct, setDeltaPct] = useState(0.15); // 15% default expected rise
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/forward-buy-analysis?product_id=${productId}&delta_pct=${deltaPct}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load forward-buy analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [productId, deltaPct]);

  if (!data) return null;

  const constraintColors = {
    shelf_life: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    storage_capacity: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    available_capital: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    economics: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-xl space-y-5">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" />
            <h3 className="font-bold text-base text-white">Quantified Forward-Buy Optimizer</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Optimal days of cover balancing price rise against capital holding cost (Prompt 4.3)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-300 font-medium">Expected Price Rise:</label>
          <select
            value={deltaPct}
            onChange={(e) => setDeltaPct(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value={0.05}>+5% Surge</option>
            <option value={0.10}>+10% Surge</option>
            <option value={0.15}>+15% Surge</option>
            <option value={0.20}>+20% Surge</option>
            <option value={0.25}>+25% Surge</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Recommended Buy</span>
            <Package size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {data.recommended_quantity?.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {data.days_of_cover} days forward cover
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Financial Benefit</span>
            <DollarSign size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            ₹{data.net_benefit?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Savings: ₹{data.savings_vs_no_action?.toLocaleString()} - Holding: ₹{data.holding_cost?.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Capital Required</span>
            <DollarSign size={14} className="text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            ₹{data.capital_required?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Unit Cost: ₹{data.unit_price}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Binding Constraint</span>
            <Layers size={14} className="text-amber-400" />
          </div>
          <div className="mt-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${constraintColors[data.binding_constraint] || 'bg-slate-700 text-slate-300'}`}>
              {data.binding_constraint?.replace('_', ' ')}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Breakeven in {data.breakeven_days} days
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis (25th / 50th / 75th percentiles) */}
      {data.sensitivity && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Risk & Sensitivity Analysis (Percentiles of Price Rise)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(data.sensitivity).map(([key, s]) => {
              const label = key === 'p25_conservative' ? 'Conservative (25th %)' :
                key === 'p50_expected' ? 'Expected (50th %)' : 'Aggressive (75th %)';
              return (
                <div key={key} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-slate-200">{label}</div>
                  <div className="flex justify-between text-slate-400 mt-2">
                    <span>Price Move:</span>
                    <span className="font-medium text-white">+{s.price_surge_pct}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400 mt-1">
                    <span>Optimal Cover:</span>
                    <span className="font-medium text-white">{s.optimal_days_cover} days</span>
                  </div>
                  <div className="flex justify-between text-slate-400 mt-1">
                    <span>Net Benefit:</span>
                    <span className="font-bold text-emerald-400">₹{s.net_benefit_rs?.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Trade-Off Curve SVG */}
      {data.curve_points && data.curve_points.length > 0 && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">Net Economic Benefit vs Days of Forward Cover</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Net Benefit</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Savings</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Holding Cost</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase">
                <tr>
                  <th className="py-2 px-3">Days Cover</th>
                  <th className="py-2 px-3">Quantity</th>
                  <th className="py-2 px-3">Gross Savings</th>
                  <th className="py-2 px-3">Holding Cost</th>
                  <th className="py-2 px-3">Net Benefit</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {data.curve_points.slice(0, 7).map((pt, idx) => (
                  <tr key={idx} className={pt.is_optimum ? 'bg-emerald-500/10 font-bold text-white' : 'hover:bg-slate-900/50'}>
                    <td className="py-2 px-3">{pt.days_of_cover}d</td>
                    <td className="py-2 px-3">{pt.quantity}</td>
                    <td className="py-2 px-3 text-blue-400">₹{pt.savings?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-red-400">₹{pt.holding_cost?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-emerald-400">₹{pt.net_benefit?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      {pt.is_optimum && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-sans uppercase">
                          Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
