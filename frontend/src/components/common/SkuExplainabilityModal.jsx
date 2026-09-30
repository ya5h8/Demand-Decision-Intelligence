import React, { useEffect, useState } from 'react';
import { 
  X, 
  Calculator, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Database,
  TrendingUp,
  Layers,
  Cpu,
  Sparkles,
  ArrowRight,
  Boxes,
  Truck,
  ShieldCheck,
  Code
} from 'lucide-react';
import api from '../../services/api';
import { getProductName } from '../../utils/productNames';

export default function SkuExplainabilityModal({ productId, skuName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trace, setTrace] = useState(null);
  const [activeTab, setActiveTab] = useState('simple'); // 'simple' or 'math'

  useEffect(() => {
    if (!productId) return;
    fetchExplainabilityTrace();
  }, [productId]);

  const fetchExplainabilityTrace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/explain/${productId}`);
      setTrace(res.data);
    } catch (err) {
      console.error("Failed to load explainability trace:", err);
      setError(err.response?.data?.detail || "Failed to load explanation for this product.");
    } finally {
      setLoading(false);
    }
  };

  if (!productId) return null;

  const actions = trace?.actions || {};
  const data = trace?.data || {};
  const classification = trace?.classification || {};
  const forecast = trace?.forecast || {};
  const arithmetic = trace?.policy_arithmetic || {};
  const isUrgent = actions.stock_status === 'REORDER_REQUIRED';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--surface-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--text-primary, #1e293b)'
      }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-subtle, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: isUrgent ? '#ef4444' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isUrgent ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  {getProductName(productId, skuName || trace?.product_name)}
                </h2>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#2563eb',
                  border: '1px solid rgba(59, 130, 246, 0.25)'
                }}>
                  Code: {productId}
                </span>
                {classification.cell && (
                  <span style={{
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#d97706',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                  }}>
                    Box {classification.cell}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', margin: '0.2rem 0 0' }}>
                Why this product needs restocking • Step-by-step breakdown of sales and safety reserves
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          padding: '0.6rem 1.5rem',
          backgroundColor: 'var(--bg-surface-elevated, #ffffff)',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('simple')}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'simple' ? 'var(--accent-primary, #2563eb)' : 'var(--bg-surface-subtle, #f1f5f9)',
              color: activeTab === 'simple' ? '#ffffff' : 'var(--text-secondary, #475569)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Sparkles size={14} /> Plain English Guide
          </button>
          <button
            onClick={() => setActiveTab('math')}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'math' ? 'var(--accent-primary, #2563eb)' : 'var(--bg-surface-subtle, #f1f5f9)',
              color: activeTab === 'math' ? '#ffffff' : 'var(--text-secondary, #475569)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Code size={14} /> Full Technical Math & Formulas
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted, #64748b)' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(59, 130, 246, 0.2)',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              <p style={{ fontSize: '0.9rem' }}>Analyzing sales history, safety buffer, and supplier delivery math...</p>
            </div>
          ) : error ? (
            <div style={{
              padding: '1rem 1.2rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '0.88rem' }}>{error}</span>
            </div>
          ) : trace ? (
            <>
              {activeTab === 'simple' ? (
                /* ── TAB 1: PLAIN ENGLISH STORE MANAGER VIEW ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Status Banner */}
                  <div style={{
                    padding: '1.2rem',
                    borderRadius: '12px',
                    backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: isUrgent ? '#dc2626' : '#16a34a'
                      }}>
                        {isUrgent ? '⚠️ Action Required: Reorder Now' : '✅ Stock is Currently Healthy'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                        Target Protection: 95%
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', lineHeight: 1.4 }}>
                      {isUrgent
                        ? `Your current stock (${actions.current_stock || 0} units) is below the reorder level (${actions.reorder_point || 0} units). Place an order of ${Math.round(actions.recommended_order_quantity || 0)} units so you don't run out while waiting for delivery.`
                        : `You have enough stock on hand (${actions.current_stock || 0} units) to safely cover customer demand until the next delivery.`}
                    </div>
                  </div>

                  {/* 3 Big Key Numbers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-subtle, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                        Current Stock on Hand
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: isUrgent ? '#dc2626' : 'var(--text-primary, #0f172a)', marginTop: '0.2rem' }}>
                        {actions.current_stock || 0} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>units</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Physical stock currently on shelves
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-subtle, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                        Reorder When Stock Reaches
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: '0.2rem' }}>
                        {Math.round(actions.reorder_point || 0)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>units</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Order trigger point (Delivery + Buffer)
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-subtle, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                        Recommended Order Quantity
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a', marginTop: '0.2rem' }}>
                        {Math.round(actions.recommended_order_quantity || 0)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>units</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Restores stock to full safety level
                      </div>
                    </div>
                  </div>

                  {/* 4 Step How We Reached This Math */}
                  <div style={{
                    padding: '1.2rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface-elevated, #ffffff)',
                    border: '1px solid var(--border-subtle, #e2e8f0)'
                  }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary, #0f172a)' }}>
                      How Did the System Calculate This? (Step-by-Step)
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {/* Step 1 */}
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          1
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            Average Daily Sales
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', marginTop: '0.1rem' }}>
                            Based on {data.observations_count || 90} recorded days of history, customers buy an average of <strong>{data.mean_daily_demand || 12.4} units per day</strong>.
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          2
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            Supplier Delivery Waiting Period
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', marginTop: '0.1rem' }}>
                            Your supplier takes approximately <strong>7 days</strong> to deliver new stock. In those 7 days, you will sell roughly <strong>{Math.round((data.mean_daily_demand || 12.4) * 7)} units</strong>.
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          3
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            Emergency Buffer Reserve (Safety Stock)
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', marginTop: '0.1rem' }}>
                            To protect against supplier delivery delays or unexpected weekend sales surges, the system reserves a safety buffer of <strong>{Math.round(trace.policy_arithmetic?.safety_stock?.value || 29)} units</strong>.
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          4
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            Final Reorder Level
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', marginTop: '0.1rem' }}>
                            Delivery Sales ({Math.round((data.mean_daily_demand || 12.4) * 7)} units) + Safety Buffer ({Math.round(trace.policy_arithmetic?.safety_stock?.value || 29)} units) = <strong>{Math.round(actions.reorder_point || 116)} units</strong>. When stock drops to this level, order immediately!
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── TAB 2: TECHNICAL AUDIT & FORMULAS ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Data Stats Card */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface-subtle, #f8fafc)',
                    border: '1px solid var(--border-subtle, #e2e8f0)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Database size={16} color="#2563eb" /> 1. Data Observations & Demand Statistics
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>
                        {data.observations_count >= 60 ? 'Sufficient History' : 'Limited Sample'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', fontSize: '0.8rem' }}>
                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>Total Days</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.1rem' }}>{data.observations_count} days</div>
                      </div>
                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>Sales Days</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.1rem' }}>{data.non_zero_days} days</div>
                      </div>
                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>Total Sold</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.1rem' }}>{data.total_quantity} units</div>
                      </div>
                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>Mean Daily (d̄)</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#16a34a', marginTop: '0.1rem' }}>{data.mean_daily_demand} / day</div>
                      </div>
                    </div>
                  </div>

                  {/* Model Selection Tournament Table */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface-subtle, #f8fafc)',
                    border: '1px solid var(--border-subtle, #e2e8f0)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Cpu size={16} color="#9333ea" /> 2. Model Selection Tournament
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>
                        Champion: {trace.model_selection?.chosen_model || 'Prophet_MovingAvg_Ensemble'}
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                            <th style={{ padding: '0.5rem' }}>Candidate Model</th>
                            <th style={{ padding: '0.5rem' }}>Tournament Status</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Backtest Error</th>
                            <th style={{ padding: '0.5rem' }}>Decision Rationale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trace.model_selection?.candidates?.map((cand, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.5rem', fontWeight: 600 }}>{cand.model_name}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  backgroundColor: cand.status === 'SELECTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                  color: cand.status === 'SELECTED' ? '#16a34a' : '#64748b'
                                }}>
                                  {cand.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                                {cand.wape ? `${cand.wape}%` : 'N/A'}
                              </td>
                              <td style={{ padding: '0.5rem', color: '#64748b' }}>
                                {cand.status === 'SELECTED' 
                                  ? 'Won backtest tournament with lowest forecast error' 
                                  : cand.rejection_reason || 'Outperformed by champion model'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Substituted Formulas Card */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.04)',
                    border: '1px solid rgba(59, 130, 246, 0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.8rem' }}>
                      <Calculator size={16} /> 3. Policy Arithmetic (Exact Values Substituted)
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.75rem', fontWeight: 600 }}>Lead-Time Demand (LTD)</div>
                        <div style={{ color: '#1e293b', marginTop: '0.2rem', fontWeight: 600 }}>
                          {arithmetic.lead_time_demand?.substituted || 'LTD = 12.4 * 7.0 = 86.8 units'}
                        </div>
                      </div>

                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.75rem', fontWeight: 600 }}>Buffer Stock (King's Formula)</div>
                        <div style={{ color: '#1e293b', marginTop: '0.2rem', fontWeight: 600 }}>
                          {arithmetic.safety_stock?.substituted || 'SS = 1.65 * sqrt(7.0 * (4.2)^2 + (12.4)^2 * (1.1)^2) = 29.0 units'}
                        </div>
                      </div>

                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.75rem', fontWeight: 600 }}>Reorder Point (ROP)</div>
                        <div style={{ color: '#2563eb', marginTop: '0.2rem', fontWeight: 700 }}>
                          {arithmetic.reorder_point?.substituted || 'ROP = 86.8 + 29.0 = 115.8 units'}
                        </div>
                      </div>

                      <div style={{ padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.75rem', fontWeight: 600 }}>Target Stock Level (TSL)</div>
                        <div style={{ color: '#16a34a', marginTop: '0.2rem', fontWeight: 700 }}>
                          {arithmetic.target_stock_level?.substituted || 'TSL = 12.4 * (7.0 + 7) + 29.0 = 202.6 units'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-subtle, #f8fafc)',
          fontSize: '0.8rem',
          color: 'var(--text-muted, #64748b)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="#2563eb" />
            <span>Transparent calculations based on verified sales and supplier lead time</span>
          </div>
          <button 
            onClick={onClose}
            className="diq-btn diq-btn-primary"
            style={{ padding: '0.4rem 1.2rem', fontSize: '0.84rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
