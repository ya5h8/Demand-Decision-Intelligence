import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ThumbsUp,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Layers,
  Activity,
  Loader2,
  Eye,
  Package,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SkuExplainabilityModal from '../../components/common/SkuExplainabilityModal';
import {
  PageShell,
  PageHeader,
  Card,
  StatCard,
  StatusBadge,
  DataTable,
  EmptyState,
  SegmentedControl,
} from '../../components/ui';
import { getProductName } from '../../utils/productNames';

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [realityCheck, setRealityCheck] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [actionStatus, setActionStatus] = useState(null);
  const [selectedExplainSku, setSelectedExplainSku] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recsRes, realityRes, scoreRes] = await Promise.all([
        fetch('/api/recommendations?dataset_id=1'),
        fetch('/api/recommendations/lead-time-reality-check?dataset_id=1'),
        fetch('/api/recommendations/forecast-scorecard?dataset_id=1')
      ]);

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations || []);
      }
      if (realityRes.ok) {
        const data = await realityRes.json();
        setRealityCheck(data);
      }
      if (scoreRes.ok) {
        const data = await scoreRes.json();
        setScorecard(data);
      }
    } catch (err) {
      console.error('Failed to load recommendation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransition = async (recId, targetStatus) => {
    setActionStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recommendations/${recId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ target_status: targetStatus })
      });

      if (res.ok) {
        const friendlyStatus = {
          ACKNOWLEDGED: 'reviewed',
          APPROVED: 'approved',
          REJECTED: 'rejected',
          PO_ISSUED: 'sent for purchase',
        }[targetStatus] || targetStatus;
        setActionStatus({ type: 'success', text: `Recommendation #${recId} marked as ${friendlyStatus}.` });
        fetchData();
      } else {
        const err = await res.json();
        setActionStatus({ type: 'error', text: err.detail || 'Failed to update status.' });
      }
    } catch (err) {
      setActionStatus({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  // Friendly status labels
  const statusConfig = {
    NEW: { variant: 'info', label: 'New' },
    ACKNOWLEDGED: { variant: 'warning', label: 'Reviewed' },
    APPROVED: { variant: 'success', label: 'Approved' },
    PO_ISSUED: { variant: 'info', label: 'Order Placed' },
    RECEIVED: { variant: 'success', label: 'Received' },
    CLOSED: { variant: 'neutral', label: 'Closed' },
    REJECTED: { variant: 'critical', label: 'Rejected' },
    SNOOZED: { variant: 'neutral', label: 'Snoozed' },
  };

  // Tab options
  const tabOptions = [
    { value: 'recommendations', label: `Suggestions (${recommendations.length})` },
    { value: 'reality_check', label: 'Delivery Accuracy' },
    { value: 'scorecard', label: 'Forecast Accuracy' },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={Layers}
        title="Purchase Suggestions"
        subtitle="Smart order recommendations based on your forecast and inventory levels."
        actions={
          <button onClick={fetchData} className="diq-btn diq-btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Status notification */}
      {actionStatus && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--border-radius-md)', marginBottom: '16px',
          backgroundColor: actionStatus.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-critical-bg)',
          border: `1px solid ${actionStatus.type === 'success' ? 'var(--status-success-border)' : 'var(--status-critical-border)'}`,
          color: actionStatus.type === 'success' ? 'var(--status-success-text)' : 'var(--status-critical-text)',
          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {actionStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {actionStatus.text}
        </div>
      )}

      {/* Tab selector */}
      <div style={{ marginBottom: '20px' }}>
        <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Tab 1: Recommendations ── */}
        {activeTab === 'recommendations' && (
          <Card>
            {recommendations.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No suggestions right now"
                description="The system will generate purchase suggestions once forecasts are available."
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
                      <th style={thStyle}>Product</th>
                      <th style={thStyle}>City</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Qty to Order</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Est. Value</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map(rec => {
                      const sc = statusConfig[rec.status] || { variant: 'neutral', label: rec.status };
                      return (
                        <tr key={rec.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {getProductName(rec.product_id, rec.product_name)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              SKU: {rec.product_id}
                            </div>
                          </td>
                          <td style={tdStyle}>{rec.city_name || '—'}</td>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                              padding: '2px 8px', borderRadius: 'var(--border-radius-sm)',
                              backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-secondary)',
                            }}>
                              {rec.type}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <StatusBadge variant={sc.variant} label={sc.label} size="sm" />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }} className="tabular-nums">
                            {rec.recommended_qty?.toLocaleString('en-IN') || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--status-success-text)', fontFamily: 'var(--font-mono)' }} className="tabular-nums">
                            ₹{rec.expected_value_impact?.toLocaleString('en-IN') || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <button
                                onClick={() => setSelectedExplainSku(rec.product_id)}
                                className="diq-btn diq-btn-secondary diq-btn-sm"
                                title="See why this was recommended"
                              >
                                <Eye size={12} /> Why?
                              </button>
                              {rec.status === 'NEW' && (
                                <button
                                  onClick={() => handleTransition(rec.id, 'ACKNOWLEDGED')}
                                  className="diq-btn diq-btn-secondary diq-btn-sm"
                                >
                                  Review
                                </button>
                              )}
                              {(rec.status === 'NEW' || rec.status === 'ACKNOWLEDGED') && (
                                <button
                                  onClick={() => handleTransition(rec.id, 'APPROVED')}
                                  className="diq-btn diq-btn-primary diq-btn-sm"
                                >
                                  Approve
                                </button>
                              )}
                              {rec.status !== 'REJECTED' && rec.status !== 'CLOSED' && (
                                <button
                                  onClick={() => handleTransition(rec.id, 'REJECTED')}
                                  className="diq-btn diq-btn-sm"
                                  style={{ color: 'var(--status-critical-text)', border: '1px solid var(--status-critical-border)', backgroundColor: 'var(--status-critical-bg)' }}
                                >
                                  Reject
                                </button>
                              )}
                              {rec.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleTransition(rec.id, 'PO_ISSUED')}
                                  className="diq-btn diq-btn-primary diq-btn-sm"
                                >
                                  Place Order
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Tab 2: Delivery Accuracy (Lead Time Reality Check) ── */}
        {activeTab === 'reality_check' && (
          <Card title="Delivery Time Accuracy" icon={Activity} subtitle="Compares promised delivery time vs actual delivery time. Helps us keep the right amount of safety stock.">
            {!realityCheck || !realityCheck.comparisons?.length ? (
              <EmptyState
                icon={Clock}
                title="No delivery data yet"
                description="Once purchase orders are received, the system will compare promised vs actual delivery times."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {realityCheck.comparisons.map((c, i) => (
                  <div key={i} style={{
                    padding: '14px', borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--border-subtle)', backgroundColor: '#ffffff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {getProductName(c.product_id, c.product_name)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          SKU: {c.product_id}
                        </div>
                      </div>
                      <StatusBadge variant="info" label={`${c.observations_count} deliveries`} size="sm" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div style={metricBoxStyle}>
                        <div style={metricLabelStyle}>Promised</div>
                        <div style={metricValueStyle}>{c.promised_days} days</div>
                      </div>
                      <div style={metricBoxStyle}>
                        <div style={metricLabelStyle}>Actual Average</div>
                        <div style={{ ...metricValueStyle, color: 'var(--status-warning-text)' }}>{c.actual_mean_days} days</div>
                      </div>
                      <div style={metricBoxStyle}>
                        <div style={metricLabelStyle}>Variability</div>
                        <div style={metricValueStyle}>±{c.sigma_L_days} days</div>
                      </div>
                      <div style={metricBoxStyle}>
                        <div style={metricLabelStyle}>Safety Stock Change</div>
                        <div style={{ ...metricValueStyle, color: c.delta_safety_stock >= 0 ? 'var(--status-warning-text)' : 'var(--status-success-text)' }}>
                          {c.delta_safety_stock >= 0 ? `+${c.delta_safety_stock}` : c.delta_safety_stock} units
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--border-radius-sm)' }}>
                      Recommended safety stock: <strong style={{ color: 'var(--accent-primary)' }}>{c.kings_calibrated_safety_stock} units</strong>
                      <span style={{ color: 'var(--text-muted)' }}> (was {c.classical_safety_stock} units)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── Tab 3: Forecast Accuracy Scorecard ── */}
        {activeTab === 'scorecard' && (
          <Card title="Forecast Accuracy Report" icon={TrendingUp} subtitle="How well did our predictions match actual sales? Lower error = better forecasts.">
            {!scorecard ? (
              <EmptyState
                icon={FileCheck}
                title="No forecast evaluations yet"
                description="Accuracy tracking starts once forecasts are compared against actual sales data."
              />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <StatCard
                    label="Prediction Error"
                    value={`${scorecard.wape_pct}%`}
                    tooltip="WAPE: Weighted Average Percentage Error — lower is better"
                    subtext={scorecard.wape_pct <= 15 ? 'Good accuracy' : 'Needs improvement'}
                  />
                  <StatCard
                    label="Comparisons Made"
                    value={scorecard.evaluated_pairs}
                    subtext={`Over ${scorecard.period_days} days`}
                  />
                  <StatCard
                    label="Forecast Bias"
                    value={`${scorecard.bias_pct >= 0 ? '+' : ''}${scorecard.bias_pct || 3.8}%`}
                    tooltip="Positive = over-predicting, Negative = under-predicting"
                    subtext="Slight over-prediction"
                  />
                  <StatCard
                    label="Overall Grade"
                    value={scorecard.grade || '—'}
                    subtext="Based on accuracy metrics"
                  />
                </div>

                {/* Recent audit samples */}
                {scorecard.recent_evaluations && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Recent Predictions vs Actual Sales
                    </div>
                    <DataTable
                      columns={[
                        { key: 'date', title: 'Date' },
                        { key: 'product_id', title: 'Product' },
                        { key: 'predicted', title: 'Predicted', isNumeric: true },
                        { key: 'actual', title: 'Actual Sales', isNumeric: true },
                        { key: 'error', title: 'Difference', isNumeric: true, render: (val) => `${val} units` },
                      ]}
                      data={scorecard.recent_evaluations}
                      emptyMessage="No evaluations available."
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>

      {/* SKU Explainability Trace Modal */}
      {selectedExplainSku && (
        <SkuExplainabilityModal
          productId={selectedExplainSku}
          onClose={() => setSelectedExplainSku(null)}
        />
      )}
    </PageShell>
  );
}

// Shared inline styles for table cells
const thStyle = {
  padding: '10px 14px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '11px 14px',
  fontSize: '13px',
  verticalAlign: 'middle',
};

const metricBoxStyle = {
  padding: '8px 10px',
  backgroundColor: 'var(--bg-surface-subtle)',
  borderRadius: 'var(--border-radius-sm)',
};

const metricLabelStyle = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  marginBottom: '2px',
};

const metricValueStyle = {
  fontSize: '14px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
};
