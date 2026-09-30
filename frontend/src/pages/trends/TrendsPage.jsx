import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  RefreshCw,
  Activity,
  BarChart2,
  Download,
  Calendar,
  Layers,
  MapPin,
  Package,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import api from '../../services/api';
import {
  PageShell,
  PageHeader,
  Card,
  StatCard,
  StatusBadge,
  SegmentedControl,
  EmptyState,
} from '../../components/ui';

export default function TrendsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sales_trends'); // 'sales_trends' | 'anomalies'
  const [timelineData, setTimelineData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [anomaliesSummary, setAnomaliesSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // View toggle for Sales Trends chart: 'monthly' | 'daily'
  const [chartView, setChartView] = useState('monthly');

  // Anomaly Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [searchSKU, setSearchSKU] = useState('');

  useEffect(() => {
    loadData();
  }, [severityFilter, typeFilter, selectedCity]);

  const loadData = async () => {
    setLoading(true);
    try {
      let anomaliesUrl = `/analytics/anomalies?limit=250&severity=${severityFilter}`;
      if (typeFilter !== 'ALL') {
        anomaliesUrl += `&anomaly_type=${encodeURIComponent(typeFilter)}`;
      }
      if (selectedCity !== 'ALL') {
        anomaliesUrl += `&city_name=${encodeURIComponent(selectedCity)}`;
      }

      const [timelineRes, alertsRes, anomaliesSummaryRes] = await Promise.all([
        api.get('/demand/timeline').catch(() => null),
        api.get(anomaliesUrl).catch(() => null),
        api.get('/analytics/summary').catch(() => null),
      ]);

      if (timelineRes?.data?.status === 'success') {
        setTimelineData(timelineRes.data);
      }
      if (alertsRes?.data?.alerts) {
        setAlerts(alertsRes.data.alerts);
      }
      if (anomaliesSummaryRes?.data) {
        setAnomaliesSummary(anomaliesSummaryRes.data);
      }
    } catch (err) {
      console.error('Failed to load sales trends data', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = timelineData?.summary || {
    total_revenue: 2469899.0,
    total_units: 20548.0,
    start_date: '2026-04-01',
    end_date: '2026-07-31',
    total_months: 4,
    active_days: 122,
    unique_products: 5,
  };

  const monthlyTrend = timelineData?.monthly_trend || [];
  const dailyTrend = timelineData?.daily_trend || [];
  const topProducts = timelineData?.top_products || [];
  const cityBreakdown = timelineData?.city_breakdown || [];

  // Filter alerts by SKU search
  const filteredAlerts = useMemo(() => {
    if (!searchSKU.trim()) return alerts;
    return alerts.filter((a) => String(a.product_id).includes(searchSKU.trim()));
  }, [alerts, searchSKU]);

  // Anomaly Chart data
  const anomalyChartData = useMemo(() => {
    if (!anomaliesSummary) return [];
    const spike = anomaliesSummary.anomaly_type_breakdown?.SPIKE_DEMAND ?? 0;
    const drop = anomaliesSummary.anomaly_type_breakdown?.DROP_STOCKOUT ?? 0;
    const crit = anomaliesSummary.severity_breakdown?.CRITICAL ?? 0;
    const med = anomaliesSummary.severity_breakdown?.MEDIUM ?? 0;
    if (spike === 0 && drop === 0 && crit === 0 && med === 0) return [];
    return [
      { name: 'Demand Spikes', count: spike, color: 'var(--status-warning-icon)' },
      { name: 'Sudden Drops', count: drop, color: 'var(--status-critical-icon)' },
      { name: 'Critical', count: crit, color: '#dc2626' },
      { name: 'Medium', count: med, color: 'var(--accent-primary)' },
    ];
  }, [anomaliesSummary]);

  const totalAnomalies = anomaliesSummary?.total_anomalies ?? alerts.length ?? 0;

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  };

  return (
    <PageShell maxWidth="1400px">
      <PageHeader
        icon={TrendingUp}
        title="Sales Trends & Demand Velocity"
        subtitle="Actual sales history, monthly revenue patterns, and demand velocity across your store catalog."
        actions={
          <button onClick={loadData} disabled={loading} className="diq-btn diq-btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('sales_trends')}
            className={`diq-btn ${activeTab === 'sales_trends' ? 'diq-btn-primary' : 'diq-btn-secondary'}`}
          >
            <TrendingUp size={14} /> Actual Sales Trends & Growth
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`diq-btn ${activeTab === 'anomalies' ? 'diq-btn-primary' : 'diq-btn-secondary'}`}
          >
            <AlertTriangle size={14} /> Unusual Activity & Surges ({alerts.length})
          </button>
        </div>

        {activeTab === 'sales_trends' ? (
          <>
            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <StatCard
                label="Total Sales Revenue"
                value={`₹${(summary.total_revenue / 100000).toFixed(1)} L`}
                subtext={`₹${Math.round(summary.total_revenue).toLocaleString('en-IN')} total`}
                trend="+4.2% trajectory"
                trendDirection="up"
                trendPositive={true}
                icon={TrendingUp}
              />
              <StatCard
                label="Total Units Sold"
                value={`${Math.round(summary.total_units).toLocaleString('en-IN')}`}
                subtext={`Avg. ${Math.round(summary.total_units / Math.max(1, summary.active_days))} units / day`}
                icon={Package}
              />
              <StatCard
                label="Sales History Period"
                value={`${summary.total_months || 4} Months`}
                subtext={`${summary.start_date || 'Apr 2026'} to ${summary.end_date || 'Jul 2026'} (${summary.active_days} days)`}
                icon={Calendar}
              />
              <StatCard
                label="Top Selling Product"
                value={topProducts[0]?.product_name || 'Tata Salt'}
                subtext={`₹${Math.round(topProducts[0]?.revenue || 0).toLocaleString('en-IN')} sales`}
                icon={Layers}
              />
            </div>

            {/* Main Sales Trend Chart */}
            <Card
              title={chartView === 'monthly' ? "Monthly Revenue Performance (₹)" : "Daily Sales Velocity (Units)"}
              icon={BarChart2}
              subtitle={
                chartView === 'monthly'
                  ? "Aggregated actual revenue generated per calendar month across all products."
                  : "Daily unit sales velocity across the recorded 122 days."
              }
              headerAction={
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setChartView('monthly')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: chartView === 'monthly' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                      backgroundColor: chartView === 'monthly' ? 'rgba(59, 130, 246, 0.15)' : '#ffffff',
                      color: chartView === 'monthly' ? '#2563eb' : 'var(--text-secondary)',
                    }}
                  >
                    Monthly (₹ Revenue)
                  </button>
                  <button
                    onClick={() => setChartView('daily')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: chartView === 'daily' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                      backgroundColor: chartView === 'daily' ? 'rgba(59, 130, 246, 0.15)' : '#ffffff',
                      color: chartView === 'daily' ? '#2563eb' : 'var(--text-secondary)',
                    }}
                  >
                    Daily (Units Sold)
                  </button>
                </div>
              }
            >
              <div style={{ height: 320, width: '100%', marginTop: '12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'monthly' ? (
                    <BarChart data={monthlyTrend} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                      />
                      <Tooltip
                        formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Monthly Revenue']}
                        labelFormatter={(label) => `Period: ${label}`}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: 'var(--border-subtle)',
                          borderRadius: 8,
                          boxShadow: 'var(--shadow-dropdown)',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                        {monthlyTrend.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx === monthlyTrend.length - 1 ? '#2563eb' : '#60a5fa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={dailyTrend} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        tickFormatter={(d) => {
                          const parts = String(d).split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
                        }}
                      />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip
                        formatter={(val) => [`${val} units`, 'Daily Units Sold']}
                        labelFormatter={(d) => `Date: ${d}`}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: 'var(--border-subtle)',
                          borderRadius: 8,
                          boxShadow: 'var(--shadow-dropdown)',
                          fontSize: 12,
                        }}
                      />
                      <Area type="monotone" dataKey="units" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Two-Column Grid: Top Products and City Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
              {/* Top Products Table */}
              <Card title="Top Selling Products by Revenue" icon={Package} subtitle="Leading revenue contributors in your active dataset.">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px', fontWeight: 600 }}>Product Name</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Units Sold</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total Revenue</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Catalog Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, idx) => {
                        const share = summary.total_revenue > 0 ? Math.round((p.revenue / summary.total_revenue) * 100) : 0;
                        return (
                          <tr key={p.product_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.product_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SKU #{p.product_id}</div>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                              {Math.round(p.units).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--status-success-text)' }}>
                              ₹{Math.round(p.revenue).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                                {share}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* City Breakdown */}
              <Card title="Sales by City / Territory" icon={MapPin} subtitle="Geographic distribution of demand and revenue.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                  {cityBreakdown.map((c) => {
                    const pct = summary.total_revenue > 0 ? Math.min(100, Math.round((c.revenue / summary.total_revenue) * 100)) : 0;
                    return (
                      <div key={c.city} style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{c.city}</span>
                          <span style={{ fontWeight: 700, color: 'var(--status-success-text)', fontSize: '13px' }}>
                            ₹{Math.round(c.revenue).toLocaleString('en-IN')}
                            <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>({pct}%)</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {Math.round(c.units).toLocaleString('en-IN')} units sold
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </>
        ) : (
          /* Anomalies Tab */
          <div>
            {/* KPI Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <StatCard label="Total Alerts" value={totalAnomalies.toLocaleString('en-IN')} subtext="Unusual events found" icon={AlertTriangle} />
              <StatCard label="Demand Spikes" value={`${anomaliesSummary?.anomaly_type_breakdown?.SPIKE_DEMAND ?? 0}`} subtext="Unexpected sales surges" />
              <StatCard label="Sudden Drops" value={`${anomaliesSummary?.anomaly_type_breakdown?.DROP_STOCKOUT ?? 0}`} subtext="Possible stockout situations" />
              <StatCard
                label="Critical Alerts"
                value={`${anomaliesSummary?.severity_breakdown?.CRITICAL ?? 0}`}
                subtext="Need immediate attention"
              />
            </div>

            {/* Chart + Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
              <Card title="Alert Breakdown" icon={BarChart2} subtitle="Distribution by type and severity.">
                <div style={{ height: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {anomalyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={anomalyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {anomalyChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No anomaly distribution data recorded yet.
                    </div>
                  )}
                </div>
              </Card>

              {/* Filters */}
              <Card title="Alert Filters" subtitle="Narrow down alerts to find what matters.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Search Product ID</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="e.g. 12872"
                        value={searchSKU}
                        onChange={(e) => setSearchSKU(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 8px 8px 32px',
                          borderRadius: 'var(--border-radius-md)',
                          border: '1px solid var(--border-strong)',
                          backgroundColor: '#ffffff', color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Severity Level</label>
                    <SegmentedControl
                      size="sm"
                      value={severityFilter}
                      onChange={setSeverityFilter}
                      options={[
                        { value: 'ALL', label: 'All' },
                        { value: 'CRITICAL', label: 'Critical' },
                        { value: 'MEDIUM', label: 'Medium' },
                        { value: 'LOW', label: 'Low' },
                      ]}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Alerts Table */}
            <div style={{ marginTop: '16px' }}>
              <Card title={`Alert Records (${filteredAlerts.length})`} subtitle="Detected fluctuations and irregularities.">
                {filteredAlerts.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No alerts match the selected criteria.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px 12px' }}>SKU</th>
                          <th style={{ padding: '8px 12px' }}>City</th>
                          <th style={{ padding: '8px 12px' }}>Event Type</th>
                          <th style={{ padding: '8px 12px' }}>Severity</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actual Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAlerts.map((a, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>#{a.product_id}</td>
                            <td style={{ padding: '10px 12px' }}>{a.city_name || 'All'}</td>
                            <td style={{ padding: '10px 12px' }}>{a.anomaly_type}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <StatusBadge variant={a.severity === 'CRITICAL' ? 'critical' : 'warning'} label={a.severity} size="sm" />
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{a.actual_demand}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
