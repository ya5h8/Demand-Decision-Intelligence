import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Download,
  FileCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import api from '../../services/api';

const BUDGET_PRESETS = [
  { label: '₹50K', value: 50000 },
  { label: '₹100K', value: 100000 },
  { label: '₹250K', value: 250000 },
  { label: '₹500K', value: 500000 },
  { label: '₹1M', value: 1000000 },
];

export default function BudgetAllocatorPage() {
  const [budget, setBudget] = useState(150000);
  const [horizonDays, setHorizonDays] = useState(14);
  const [locationId, setLocationId] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [poGenerating, setPoGenerating] = useState(false);
  const [poSuccessMessage, setPoSuccessMessage] = useState(null);

  const debounceTimerRef = useRef(null);

  // Fetch allocation data
  const fetchAllocation = async (budgetValue, horizonValue, locValue) => {
    setLoading(true);
    try {
      const res = await api.post('/inventory/allocate', {
        budget: Number(budgetValue),
        horizon_days: Number(horizonValue),
        location_id: locValue === 'ALL' ? null : locValue,
      });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to run budget allocation', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced run on slider / input change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchAllocation(budget, horizonDays, locationId);
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [budget, horizonDays, locationId]);

  const summary = data?.summary || {};
  const selectedSkus = data?.selected_skus || [];
  const unselectedTopSkus = data?.unselected_top_skus || [];
  const curve = data?.curve || [];

  // Generate Draft Purchase Orders from this allocation
  const handleGeneratePurchaseOrders = async () => {
    if (selectedSkus.length === 0) return;
    setPoGenerating(true);
    setPoSuccessMessage(null);
    try {
      const payload = {
        replenishment_items: selectedSkus.map(s => ({
          product_id: s.product_id,
          needed_quantity: s.order_quantity
        }))
      };
      const res = await api.post('/purchase-orders/generate', payload);
      const poCount = res.data?.purchase_orders?.length || 1;
      setPoSuccessMessage(`Successfully converted allocation into ${poCount} draft Purchase Order(s)!`);
      setTimeout(() => setPoSuccessMessage(null), 6000);
    } catch (err) {
      console.error('Failed to generate POs', err);
    } finally {
      setPoGenerating(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (selectedSkus.length === 0) return;
    const headers = [
      'Product ID',
      'Product Name',
      'City',
      'Order Quantity',
      'Unit Cost',
      'Total Cost',
      'P(Stockout)',
      'Expected Lost Units',
      'Risk Avoided (INR)',
      'Benefit/Cost Ratio'
    ];
    const rows = selectedSkus.map(s => [
      s.product_id,
      `"${(s.product_name || '').replace(/"/g, '""')}"`,
      s.city_name,
      s.order_quantity,
      s.unit_cost,
      s.cost,
      s.p_stockout,
      s.expected_lost_units,
      s.expected_stockout_cost_avoided,
      s.benefit_cost_ratio
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `budget_allocation_${budget}_horizon_${horizonDays}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Dimensions & Path Generation
  const chartWidth = 720;
  const chartHeight = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const chartCoords = useMemo(() => {
    const innerW = chartWidth - padding.left - padding.right;
    const innerH = chartHeight - padding.top - padding.bottom;
    const baselineY = padding.top + innerH;

    if (!curve || curve.length === 0) {
      return { path: '', area: '', points: [], maxSpend: 1, maxRisk: 1, budgetX: 0, baselineY, innerH, innerW };
    }

    const maxSpend = Math.max(...curve.map(p => p.spend), budget * 1.2, 1000);
    const maxRisk = Math.max(...curve.map(p => p.cumulative_risk_avoided), 100);

    const points = curve.map(p => {
      const x = padding.left + (p.spend / maxSpend) * innerW;
      const y = padding.top + innerH - (p.cumulative_risk_avoided / maxRisk) * innerH;
      return { x, y, spend: p.spend, risk: p.cumulative_risk_avoided, count: p.sku_count };
    });

    const path = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
    const area = `${path} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

    const budgetX = padding.left + (budget / maxSpend) * innerW;

    return { path, area, points, maxSpend, maxRisk, budgetX, baselineY, innerH, innerW };
  }, [curve, budget]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Capital Allocation Planner
            </h1>
            <span
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <Sparkles size={13} /> {summary.optimization_method || '0/1 Knapsack DP'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            "What should I buy with the money I have?" — Solves the constrained procurement knapsack problem to maximize stockout risk avoided.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={handleExportCsv}
            disabled={selectedSkus.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: selectedSkus.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={handleGeneratePurchaseOrders}
            disabled={selectedSkus.length === 0 || poGenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--accent-primary)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: selectedSkus.length === 0 || poGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            {poGenerating ? <RefreshCw size={15} className="spin-icon" /> : <FileCheck size={15} />}
            Generate Draft POs ({selectedSkus.length})
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {poSuccessMessage && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-emerald)',
            color: 'var(--accent-emerald)',
            padding: '0.8rem 1.2rem',
            borderRadius: '8px',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          <CheckCircle2 size={18} /> {poSuccessMessage}
        </div>
      )}

      {/* Control Card: Slider & Horizon */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.4rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          {/* Slider & Presets */}
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Available Procurement Budget
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  ₹{Number(budget).toLocaleString()}
                </span>
                {loading && <RefreshCw size={14} className="spin-icon" style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="10000"
              max="1500000"
              step="5000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                accentColor: 'var(--accent-primary)',
                cursor: 'pointer',
                marginBottom: '0.8rem'
              }}
            />

            {/* Presets */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {BUDGET_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setBudget(p.value)}
                  style={{
                    backgroundColor: budget === p.value ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: budget === p.value ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + (budget === p.value ? 'var(--accent-primary)' : 'var(--border-subtle)'),
                    borderRadius: '6px',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizon & Location Selector */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Planning Horizon
              </label>
              <select
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value={7}>7 Days (Fast Turn)</option>
                <option value={14}>14 Days (Standard)</option>
                <option value={30}>30 Days (Monthly)</option>
                <option value={60}>60 Days (Seasonal)</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Warehouse Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="ALL">All Hubs (Consolidated)</option>
                <option value="Delhi">Delhi DC</option>
                <option value="Mumbai">Mumbai DC</option>
                <option value="Bengaluru">Bengaluru DC</option>
                <option value="HR-NCR">HR-NCR Hub</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Spend */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Planned Spend
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
            ₹{Math.round(summary.total_spend || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            Budget Remaining: <strong style={{ color: 'var(--accent-cyan)' }}>₹{Math.round(summary.budget_remaining || 0).toLocaleString()}</strong>
          </div>
        </div>

        {/* Risk Cost Avoided */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Stockout Risk Avoided
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
            ₹{Math.round(summary.total_stockout_cost_avoided || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', marginTop: '0.4rem' }}>
            {summary.risk_mitigation_pct || 0}% of Total Catalog Exposure
          </div>
        </div>

        {/* Efficiency / ROI Multiplier */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Risk ROI Efficiency
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-amber)', marginTop: '0.3rem' }}>
            {summary.roi_ratio || 0}x
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            ₹{summary.roi_ratio || 0} risk avoided per ₹1.00 spent
          </div>
        </div>

        {/* SKU Coverage */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Replenishment Coverage
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.3rem' }}>
            {summary.selected_skus_count || 0} / {summary.candidate_skus_count || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: summary.unfunded_skus_count > 0 ? '#f87171' : 'var(--accent-emerald)', marginTop: '0.4rem' }}>
            {summary.unfunded_skus_count || 0} SKUs Unfunded (Risk Accepted)
          </div>
        </div>
      </div>

      {/* Diminishing Returns Chart Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.4rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Cumulative Stockout Risk Reduction vs Spend
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              Notice the curve flattening at higher spends: every additional rupee yields diminishing stockout mitigation.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6' }}></span> Cumulative Risk Avoided
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 10, height: 2, backgroundColor: '#ef4444' }}></span> Current Budget
            </span>
          </div>
        </div>

        {/* SVG Container */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}
          >
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + chartCoords.innerH * (1 - ratio);
              const labelRisk = Math.round(chartCoords.maxRisk * ratio);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.07)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="10"
                  >
                    ₹{labelRisk >= 1000 ? `${Math.round(labelRisk / 1000)}k` : labelRisk}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {chartCoords.area && (
              <path d={chartCoords.area} fill="url(#curveGradient)" />
            )}

            {/* Curve Line */}
            {chartCoords.path && (
              <path
                d={chartCoords.path}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Current Budget Vertical Line */}
            {chartCoords.budgetX && (
              <g>
                <line
                  x1={chartCoords.budgetX}
                  y1={padding.top}
                  x2={chartCoords.budgetX}
                  y2={chartCoords.baselineY}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={chartCoords.budgetX}
                  cy={padding.top + 8}
                  r="4"
                  fill="#ef4444"
                />
                <text
                  x={chartCoords.budgetX}
                  y={padding.top - 5}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="10"
                  fontWeight="bold"
                >
                  Budget ₹{Math.round(budget / 1000)}k
                </text>
              </g>
            )}

            {/* Interactive Points on Hover */}
            {chartCoords.points && chartCoords.points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="#60a5fa"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverPoint(pt)}
                onMouseLeave={() => setHoverPoint(null)}
              />
            ))}

            {/* Hover Tooltip Box */}
            {hoverPoint && (
              <g transform={`translate(${Math.min(hoverPoint.x, chartWidth - 140)}, ${Math.max(hoverPoint.y - 45, 10)})`}>
                <rect
                  width="130"
                  height="40"
                  rx="6"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text x="8" y="16" fill="#94a3b8" fontSize="10">
                  Spend: ₹{Math.round(hoverPoint.spend).toLocaleString()}
                </text>
                <text x="8" y="30" fill="#38bdf8" fontSize="11" fontWeight="bold">
                  Risk: ₹{Math.round(hoverPoint.risk).toLocaleString()} ({hoverPoint.count} SKUs)
                </text>
              </g>
            )}

            {/* X-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const x = padding.left + chartCoords.innerW * ratio;
              const spendLabel = Math.round((chartCoords.maxSpend * ratio) / 1000);
              return (
                <text
                  key={i}
                  x={x}
                  y={chartCoords.baselineY + 18}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                >
                  ₹{spendLabel}k
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Top 5 Unselected SKUs: What You Are Accepting Risk On (Crucial Requirement) */}
      {unselectedTopSkus.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1.4rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <ShieldAlert size={20} color="#f87171" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f87171' }}>
              Risk Exposure: Top 5 SKUs That Did NOT Make The Cut
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            These critical items could not be funded within the current ₹{Number(budget).toLocaleString()} budget.
            If customer demand materializes over the next {horizonDays} days, these represent your primary stockout exposure:
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem' }}>SKU</th>
                  <th style={{ padding: '0.6rem' }}>City</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>On Hand / ROP</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>Order Needed</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>Cost</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>P(Stockout)</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>Exposure (Risk Accepted)</th>
                  <th style={{ padding: '0.6rem', textAlign: 'center' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {unselectedTopSkus.map((sku) => (
                  <tr key={`${sku.product_id}-${sku.city_name}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.6rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      #{sku.product_id} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({sku.product_name})</span>
                    </td>
                    <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{sku.city_name}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                      <span style={{ color: '#f87171', fontWeight: 600 }}>{sku.current_stock}</span> / {sku.rop}
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>{sku.order_quantity} units</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>₹{Math.round(sku.cost).toLocaleString()}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                      {(sku.p_stockout * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700, color: '#fca5a5' }}>
                      ₹{Math.round(sku.expected_stockout_cost_avoided).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        Budget Cap
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected SKUs Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.4rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Funded Replenishment Allocation ({selectedSkus.length} SKUs)
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Ranked by Benefit-to-Cost Ratio (Marginal Return on Capital)
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Rank</th>
                <th style={{ padding: '0.75rem' }}>SKU & Name</th>
                <th style={{ padding: '0.75rem' }}>City</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Stock / ROP</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Order Qty (MOQ/Pack)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cost</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>P(Stockout)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Lost Units Avoided</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Risk Avoided</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>ROI Ratio</th>
              </tr>
            </thead>
            <tbody>
              {selectedSkus.map((sku, idx) => (
                <tr
                  key={`${sku.product_id}-${sku.city_name}`}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>#{idx + 1}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>#{sku.product_id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{sku.product_name}</div>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{sku.city_name}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{sku.current_stock}</span> / {sku.rop}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>{sku.order_quantity.toLocaleString()} units</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MOQ {sku.moq} · Pack {sku.pack_size}</div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    ₹{Math.round(sku.cost).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-amber)', fontWeight: 600 }}>
                    {(sku.p_stockout * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {sku.expected_lost_units.toLocaleString()} units
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    ₹{Math.round(sku.expected_stockout_cost_avoided).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-emerald)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {sku.benefit_cost_ratio}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedSkus.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No SKUs can be funded with the current budget. Try increasing the budget slider above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
