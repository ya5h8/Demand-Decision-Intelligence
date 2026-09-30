import React, { useEffect, useState, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sliders,
  Building2,
  Package,
  Layers,
  ArrowUpDown,
  History,
  Activity,
  Calendar,
  Loader2,
  Eye,
  ShoppingCart,
  X,
  Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { recomputeForecast } from '../../services/api';
import ForwardBuyWidget from './ForwardBuyWidget';
import SkuExplainabilityModal from '../../components/common/SkuExplainabilityModal';
import {
  PageShell,
  PageHeader,
  Card,
  StatCard,
  StatusBadge,
  EmptyState,
} from '../../components/ui';
import { getProductName } from '../../utils/productNames';

const Z_SCORES = {
  0.90: 1.282,
  0.95: 1.645,
  0.98: 2.054,
  0.99: 2.326,
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'simulation'
  const [data, setData] = useState([]);
  const [simulationData, setSimulationData] = useState([]);
  const [freshness, setFreshness] = useState(null);
  const [recomputing, setRecomputing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchSKU, setSearchSKU] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [leadTimeDays, setLeadTimeDays] = useState(3);
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [sortField, setSortField] = useState('mean_daily_demand');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedForwardBuySku, setSelectedForwardBuySku] = useState(null);
  const [selectedExplainSku, setSelectedExplainSku] = useState(null);

  useEffect(() => {
    loadInventoryData();
    loadSimulationData();
  }, [selectedCity]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      let url = '/inventory/recommendations?limit=500';
      if (selectedCity !== 'ALL') {
        url += `&city_name=${encodeURIComponent(selectedCity)}`;
      }
      const res = await api.get(url);
      if (res?.data?.data) {
        setData(res.data.data);
      }
      if (res?.data?.freshness) {
        setFreshness(res.data.freshness);
      }
    } catch (err) {
      console.error('Failed to load inventory recommendations', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSimulationData = async () => {
    try {
      let url = '/inventory/status?limit=300';
      if (selectedCity !== 'ALL') {
        url += `&city_name=${encodeURIComponent(selectedCity)}`;
      }
      const res = await api.get(url);
      if (res?.data?.data) {
        setSimulationData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load simulation status', err);
    }
  };

  const handleRecomputeNow = async () => {
    setRecomputing(true);
    try {
      await recomputeForecast();
      await loadInventoryData();
      await loadSimulationData();
    } catch (err) {
      console.error('Recompute failed', err);
    } finally {
      setRecomputing(false);
    }
  };

  // Dynamic calculations based on user sliders for policy recommendations
  const processedData = useMemo(() => {
    const z = Z_SCORES[serviceLevel] || 1.645;
    const lt = Number(leadTimeDays) || 3;

    return data.map((item) => {
      const mean = Number(item.mean_daily_demand || item.avg_daily_demand) || 0;
      const std = Number(item.std_daily_demand) || Math.round(mean * 0.12);
      const sigmaL = item.sigma_lead_time_days != null ? Number(item.sigma_lead_time_days) : (0.25 * lt);
      const ltConfidence = item.lead_time_confidence || (item.lead_time_observations_count >= 5 ? 'HIGH' : 'LOW');

      // Dynamic inventory formula (King's formula with lead time variability)
      const varianceDemandTerm = lt * Math.pow(std, 2);
      const varianceLeadTimeTerm = Math.pow(mean, 2) * Math.pow(sigmaL, 2);
      const ssKings = Math.ceil(z * Math.sqrt(varianceDemandTerm + varianceLeadTimeTerm));
      const ssClassical = Math.ceil(z * std * Math.sqrt(lt));
      const ssDelta = ssKings - ssClassical;

      const rop = Math.ceil(mean * lt + ssKings);
      const tsl = Math.ceil(mean * (lt + 7) + ssKings);

      let status = 'HEALTHY';
      let statusVariant = 'success';
      let actionText = 'Stock level OK';

      if (mean > 5000 && std / (mean || 1) > 0.12) {
        status = 'REORDER_NOW';
        statusVariant = 'critical';
        actionText = 'Order now — risk of running out';
      } else if (mean > 3000) {
        status = 'BUFFER_REVIEW';
        statusVariant = 'warning';
        actionText = 'Check supplier delivery times';
      }

      return {
        ...item,
        calculated_ss: ssKings,
        ss_classical: ssClassical,
        ss_delta: ssDelta,
        sigma_lead_time: sigmaL,
        lead_time_confidence: ltConfidence,
        calculated_rop: rop,
        calculated_tsl: tsl,
        status,
        statusVariant,
        actionText,
      };
    });
  }, [data, leadTimeDays, serviceLevel]);

  // Filter recommendations
  const filteredData = useMemo(() => {
    return processedData
      .filter((row) => {
        if (!searchSKU) return true;
        const q = searchSKU.trim().toLowerCase();
        const pName = getProductName(row.product_id, row.product_name).toLowerCase();
        return String(row.product_id).toLowerCase().includes(q) || pName.includes(q);
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [processedData, searchSKU, sortField, sortAsc]);

  // Filter simulation records
  const filteredSimulation = useMemo(() => {
    return simulationData.filter((row) => {
      if (!searchSKU) return true;
      const q = searchSKU.trim().toLowerCase();
      const pName = getProductName(row.product_id, row.product_name).toLowerCase();
      return String(row.product_id).toLowerCase().includes(q) || pName.includes(q);
    });
  }, [simulationData, searchSKU]);

  // KPI Metrics
  const totalSKUs = filteredData.length;
  const reorderUrgentCount = filteredData.filter((r) => r.status === 'REORDER_NOW').length;
  const avgSafetyStock = Math.round(
    filteredData.reduce((acc, r) => acc + (r.calculated_ss || 0), 0) / (totalSKUs || 1)
  );

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ field, label, align = 'left' }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{
        ...thStyle,
        textAlign: align,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        <ArrowUpDown size={11} style={{ opacity: sortField === field ? 1 : 0.3 }} />
      </div>
    </th>
  );

  return (
    <PageShell maxWidth="1400px">
      <PageHeader
        icon={Boxes}
        title="Stock & Reorder Planning"
        subtitle="Know exactly how much inventory to buy from suppliers and when to place the order so you never run out of stock."
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--border-radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={activeTab === 'recommendations' ? 'diq-btn diq-btn-primary diq-btn-sm' : 'diq-btn diq-btn-secondary diq-btn-sm'}
                style={{ borderRadius: '4px', border: 'none' }}
              >
                Stock Policy
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={activeTab === 'simulation' ? 'diq-btn diq-btn-primary diq-btn-sm' : 'diq-btn diq-btn-secondary diq-btn-sm'}
                style={{ borderRadius: '4px', border: 'none' }}
              >
                Movement Simulation
              </button>
            </div>
            <button
              onClick={() => {
                loadInventoryData();
                loadSimulationData();
              }}
              className="diq-btn diq-btn-secondary"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Zero State Alert Banner */}
        {data.length === 0 && !loading && (
          <div style={{
            padding: '20px 24px',
            backgroundColor: 'var(--surface-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                No Inventory Recommendations Found
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Upload a retail sales CSV file to compute safety stock, reorder levels, and replenishment quantities.
              </div>
            </div>
            <button onClick={() => navigate('/upload')} className="diq-btn diq-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Download size={15} /> Upload Sales CSV
            </button>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          <StatCard label="Products Tracked" value={totalSKUs.toLocaleString('en-IN')} subtext="In selected city" />
          <StatCard
            label="Need Urgent Reorder"
            value={reorderUrgentCount}
            subtext="High risk of stockout"
            style={reorderUrgentCount > 0 ? { borderColor: 'var(--status-critical-border)' } : {}}
          />
          <StatCard
            label="Avg. Safety Stock"
            value={`${avgSafetyStock.toLocaleString('en-IN')} units`}
            subtext={`Protecting ${Math.round(serviceLevel * 100)}% service`}
          />
          <StatCard
            label="Delivery Time"
            value={`${leadTimeDays} days`}
            subtext="From supplier to warehouse"
          />
        </div>

        {/* ── Settings & Filters ── */}
        <Card title="Settings & Filters" icon={Sliders} subtitle="Change these to see how stock levels would change.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Search */}
            <div>
              <label style={labelStyle}>Search Product ID</label>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. 19512"
                  value={searchSKU}
                  onChange={(e) => setSearchSKU(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* City filter */}
            <div>
              <label style={labelStyle}>City / Warehouse</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={selectStyle}
              >
                <option value="ALL">All Cities</option>
                <option value="Delhi">Delhi</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="HR-NCR">HR-NCR</option>
              </select>
            </div>

            {/* Lead time slider (Tab 1) */}
            {activeTab === 'recommendations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={labelStyle}>Supplier Delivery Time</label>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>{leadTimeDays} days</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  step="1"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>1 day</span>
                  <span>14 days</span>
                </div>
              </div>
            )}

            {/* Service level (Tab 1) */}
            {activeTab === 'recommendations' && (
              <div>
                <label style={labelStyle}>Service Level (target availability)</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {[0.90, 0.95, 0.98, 0.99].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setServiceLevel(lvl)}
                      className={serviceLevel === lvl ? 'diq-btn diq-btn-primary diq-btn-sm' : 'diq-btn diq-btn-secondary diq-btn-sm'}
                      style={{ flex: 1 }}
                    >
                      {Math.round(lvl * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── TAB 1: Main Recommendations Data Table ── */}
        {activeTab === 'recommendations' && (
          <Card
            title="Stock Levels & Reorder Points"
            subtitle="Calculated with King's safety stock formula accounting for lead time variance."
            actions={
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filteredData.length} products
              </span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
                    <SortHeader field="product_id" label="Product Name / SKU" />
                    <SortHeader field="city_name" label="City" />
                    <SortHeader field="mean_daily_demand" label="Daily Demand" align="right" />
                    <SortHeader field="calculated_ss" label="Safety Stock" align="right" />
                    <SortHeader field="calculated_rop" label="Reorder At" align="right" />
                    <SortHeader field="calculated_tsl" label="Target Stock" align="right" />
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 && !loading ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No products match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => {
                      return (
                        <tr
                          key={`${row.product_id}-${row.city_name}`}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {getProductName(row.product_id, row.product_name)}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                Code: {row.product_id}
                              </span>
                            </div>
                          </td>
                          <td style={tdStyle}>{row.city_name}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.round(row.mean_daily_demand || row.avg_daily_demand || 0).toLocaleString('en-IN')} units
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <div style={{ fontWeight: 600 }}>{row.calculated_ss?.toLocaleString('en-IN')}</div>
                            {row.ss_delta > 0 && (
                              <div style={{ fontSize: '10px', color: 'var(--accent-amber)', opacity: 0.9 }}>
                                +{row.ss_delta} lead-time buffer
                              </div>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ color: 'var(--status-critical-text)', fontWeight: 600 }}>
                              {row.calculated_rop?.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {row.calculated_tsl?.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <StatusBadge
                              variant={row.statusVariant}
                              label={row.actionText}
                              size="sm"
                            />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                onClick={() => setSelectedExplainSku(row.product_id)}
                                className="diq-btn diq-btn-secondary diq-btn-sm"
                                title="Explain this recommendation"
                                style={{ padding: '4px 8px' }}
                              >
                                <Eye size={12} /> Explain
                              </button>
                              <button
                                onClick={() => setSelectedForwardBuySku(row.product_id)}
                                className="diq-btn diq-btn-secondary diq-btn-sm"
                                title="Forward Buy Analysis"
                                style={{ padding: '4px 8px' }}
                              >
                                <ShoppingCart size={12} /> Bulk
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Freshness Bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px',
              paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap',
              gap: '10px', fontSize: '12px', color: 'var(--text-muted)',
            }}>
              <div>
                Last calculated: {freshness?.computed_at ? new Date(freshness.computed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'just now'}
                {' · '}
                <button
                  onClick={handleRecomputeNow}
                  disabled={recomputing}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '12px', fontWeight: 500 }}
                >
                  {recomputing ? 'Recalculating...' : 'Recalculate now'}
                </button>
              </div>

              {freshness?.is_stale && (
                <StatusBadge variant="warning" label="New data available — recalculate recommended" size="sm" />
              )}
            </div>
          </Card>
        )}

        {/* ── TAB 2: Daily Movement Simulation Status Table ── */}
        {activeTab === 'simulation' && (
          <Card
            title="Daily Inventory Movement Simulation Status"
            subtitle="Simulation Formula: Closing Stock = Opening Stock + Stock Received - Sales Quantity"
            actions={
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filteredSimulation.length} daily snapshots
              </span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Date</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>SKU & Hub</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Opening</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Received</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Sales</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Closing Stock</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Days Cover</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Risk Status</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Action Guidance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSimulation.slice(0, 100).map((row, idx) => {
                    const riskVariant =
                      row.stockout_risk === 'CRITICAL_STOCKOUT'
                        ? 'critical'
                        : row.stockout_risk === 'REORDER_RECOMMENDED'
                          ? 'warning'
                          : 'success';

                    return (
                      <tr
                        key={`${row.product_id}-${row.snapshot_date}-${idx}`}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {row.snapshot_date}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {getProductName(row.product_id, row.product_name)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Code: {row.product_id} • {row.city_name}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>
                          {Math.round(row.opening_stock).toLocaleString('en-IN')}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: row.stock_received > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                          {row.stock_received > 0 ? `+${Math.round(row.stock_received).toLocaleString('en-IN')}` : '0'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--status-critical-text)' }}>
                          -{Math.round(row.sales_quantity).toLocaleString('en-IN')}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {Math.round(row.closing_stock).toLocaleString('en-IN')}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontWeight: 600, color: row.days_of_cover < 3 ? 'var(--status-critical-text)' : 'var(--text-primary)' }}>
                            {row.days_of_cover}d
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <StatusBadge variant={riskVariant} label={row.stockout_risk} size="sm" />
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {row.action_text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredSimulation.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  No simulation records found for the selected filter.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Forward Buy Simulator ── */}
        {selectedForwardBuySku && (
          <Card
            title={`Bulk Purchase Simulator — Product #${selectedForwardBuySku}`}
            subtitle="See if buying more at once would save money."
            actions={
              <button onClick={() => setSelectedForwardBuySku(null)} className="diq-btn diq-btn-secondary diq-btn-sm">
                <X size={14} /> Close
              </button>
            }
          >
            <ForwardBuyWidget productId={selectedForwardBuySku} />
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

// Shared styles
const thStyle = {
  padding: '10px 14px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '11px 14px',
  verticalAlign: 'middle',
  color: 'var(--text-primary)',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 8px 8px 32px',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid var(--border-strong)',
  backgroundColor: '#ffffff',
  color: 'var(--text-primary)',
  fontSize: '13px',
};

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid var(--border-strong)',
  backgroundColor: '#ffffff',
  color: 'var(--text-primary)',
  fontSize: '13px',
};
