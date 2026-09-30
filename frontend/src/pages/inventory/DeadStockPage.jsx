import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  Percent,
  Truck,
  Trash2,
  Tag,
  X,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { getProductName } from '../../utils/productNames';

const ACTION_COLORS = {
  MARKDOWN: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  TRANSFER: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  BUNDLE: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  RETURN_TO_SUPPLIER: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  WRITE_OFF: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  DELIST: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
};

export default function DeadStockPage() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [minInactivityDays, setMinInactivityDays] = useState(90);
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [applyingAction, setApplyingAction] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedActionFilter, minInactivityDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, itemsRes] = await Promise.all([
        api.get('/dead-stock/summary'),
        api.get(`/dead-stock/items?action=${selectedActionFilter}&min_days_inactive=${minInactivityDays}&limit=100`)
      ]);
      if (sumRes?.data) setSummary(sumRes.data);
      if (itemsRes?.data?.items) setItems(itemsRes.data.items);
    } catch (err) {
      console.error('Failed to load dead stock data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAction = async (item, actionName, discountPct = null) => {
    setApplyingAction(true);
    try {
      await api.post(`/dead-stock/${item.id}/action`, {
        action_taken: actionName,
        discount_pct: discountPct != null ? Number(discountPct) : item.suggested_discount_pct,
        notes: `Manager approved ${actionName} downward clearance`
      });
      setActionSuccess(`Downward action ${actionName} successfully applied to SKU #${item.product_id}!`);
      setActiveModalItem(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to apply action', err);
    } finally {
      setApplyingAction(false);
    }
  };

  const headline = summary?.headline || {};
  const breakdown = summary?.action_breakdown || {};

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Dead Stock & Downward Actions
            </h1>
            <span
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <Flame size={13} /> Capital Recovery Engine
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            Detects zero-movement items and excessive forward cover, solves optimal clearance markdowns via price elasticity, and initiates downward clearance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={loadData}
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
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Scan Catalog Now
          </button>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
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
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      {/* HEADLINE STAT BANNER — THAT NUMBER IS WHAT GETS A MANAGER'S ATTENTION */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '14px',
          padding: '1.8rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center'
        }}
      >
        {/* Headline Number */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <AlertTriangle size={16} /> Total Capital Locked Up
          </div>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#fca5a5', marginTop: '0.2rem', lineHeight: 1.1 }}>
            ₹{Math.round(headline.total_capital_locked_up || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Tied up across <strong>{headline.dead_skus_count || 0} inactive or overstocked SKUs</strong>
          </div>
        </div>

        {/* Monthly Storage Drain */}
        <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '1.5rem' }}>
          <div style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Monthly Holding Cost Drain
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fde68a', marginTop: '0.2rem' }}>
            ₹{Math.round(headline.total_monthly_storage_drain || 0).toLocaleString()}
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}> / mo</span>
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Warehouse floor space and working capital financing carrying cost
          </div>
        </div>

        {/* Projected Recovery Value */}
        <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '1.5rem' }}>
          <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Projected Cash Recovery
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6ee7b7', marginTop: '0.2rem' }}>
            ₹{Math.round(headline.projected_total_recovery || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Recoverable capital upon executing suggested clearance markdowns & transfers
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Inactivity Days & Action Category */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Action Category Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedActionFilter('ALL')}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: selectedActionFilter === 'ALL' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedActionFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid ' + (selectedActionFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--border-subtle)')
            }}
          >
            All Actions ({headline.dead_skus_count || 0})
          </button>
          {Object.entries(breakdown).map(([act, count]) => {
            const styling = ACTION_COLORS[act] || ACTION_COLORS.MARKDOWN;
            return (
              <button
                key={act}
                onClick={() => setSelectedActionFilter(act)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: selectedActionFilter === act ? styling.bg : 'rgba(255, 255, 255, 0.03)',
                  color: selectedActionFilter === act ? styling.text : 'var(--text-secondary)',
                  border: `1px solid ${selectedActionFilter === act ? styling.border : 'var(--border-subtle)'}`
                }}
              >
                {act} ({count})
              </button>
            );
          })}
        </div>

        {/* Inactivity Threshold Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Inactivity Cutoff:
          </label>
          <select
            value={minInactivityDays}
            onChange={(e) => setMinInactivityDays(Number(e.target.value))}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem'
            }}
          >
            <option value={60}>&gt; 60 Days Inactive</option>
            <option value={90}>&gt; 90 Days Inactive (Standard)</option>
            <option value={180}>&gt; 180 Days Inactive</option>
            <option value={270}>&gt; 270 Days (Critical Obsolescence)</option>
          </select>
        </div>
      </div>

      {/* Dead Stock Items Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.4rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Candidate Items for Downward Action ({items.length})
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Ranked by Capital Tied Up Descending
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>SKU & Details</th>
                <th style={{ padding: '0.75rem' }}>DC Hub</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>On Hand</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Inactivity</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Days of Cover</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Capital Locked</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monthly Drain</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Recommended Action</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Execute</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sku) => {
                const styling = ACTION_COLORS[sku.recommended_action] || ACTION_COLORS.MARKDOWN;
                return (
                  <tr
                    key={sku.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{getProductName(sku.product_id, sku.product_name)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>SKU: {sku.product_id}</div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {sku.city_name}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sku.on_hand.toLocaleString()} units
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: sku.days_inactive >= 180 ? '#ef4444' : '#fbbf24' }}>
                      {sku.days_inactive} days
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {Math.round(sku.days_of_cover)} days
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#fca5a5' }}>
                      ₹{Math.round(sku.capital_tied_up).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-amber)' }}>
                      ₹{Math.round(sku.monthly_storage_cost).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: styling.bg,
                          color: styling.text,
                          border: `1px solid ${styling.border}`,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-block'
                        }}
                      >
                        {sku.recommended_action} {sku.recommended_action === 'MARKDOWN' && `(${sku.suggested_discount_percent}%)`}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => setActiveModalItem(sku)}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Action Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {items.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No dead stock items detected matching the selected filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Downward Action Clearance Simulator Modal */}
      {activeModalItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.6rem',
              width: '100%',
              maxWidth: '560px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={20} color="#f87171" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Clearance Action: {getProductName(activeModalItem.product_id, activeModalItem.product_name)} (SKU: {activeModalItem.product_id})
                </h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              {activeModalItem.product_name} · DC {activeModalItem.city_name} · Category: {activeModalItem.category}
            </p>

            {/* Financial Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.2rem' }}>
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capital Locked Up</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fca5a5' }}>
                  ₹{Math.round(activeModalItem.capital_tied_up).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Recovery</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  ₹{Math.round(activeModalItem.projected_recovery_value).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Markdown Solver Explanation */}
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '0.9rem', marginBottom: '1.2rem', fontSize: '0.84rem' }}>
              <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={15} /> Econometric Markdown Solver (Elasticity {activeModalItem.elasticity_used})
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Solves for optimal discount to accelerate clearance within 45 days. Under price elasticity ε = {activeModalItem.elasticity_used}
                {activeModalItem.is_assumption ? ' (Category Default Assumption)' : ' (Econometric Historical Model)'},
                a <strong>{activeModalItem.suggested_discount_percent}% markdown</strong> produces the required demand lift while saving ₹{Math.round(activeModalItem.monthly_storage_cost * 2)} in carrying costs.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveModalItem(null)}
                style={{
                  padding: '0.55rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleApplyAction(activeModalItem, 'WRITE_OFF')}
                disabled={applyingAction}
                style={{
                  padding: '0.55rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Write Off
              </button>
              <button
                onClick={() => handleApplyAction(activeModalItem, 'MARKDOWN', activeModalItem.suggested_discount_pct)}
                disabled={applyingAction}
                style={{
                  padding: '0.55rem 1.2rem',
                  backgroundColor: 'var(--accent-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {applyingAction ? 'Applying...' : `Apply ${activeModalItem.suggested_discount_percent}% Markdown`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
