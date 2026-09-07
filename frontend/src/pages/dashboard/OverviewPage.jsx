import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { ArrowUpRight, TrendingUp, AlertTriangle, PackageCheck } from 'lucide-react';

const mockChartData = [
  { date: 'Mon', actual: 4000, forecast: 4200 },
  { date: 'Tue', actual: 3000, forecast: 3100 },
  { date: 'Wed', actual: 5000, forecast: 4800 },
  { date: 'Thu', actual: 2780, forecast: 2900 },
  { date: 'Fri', actual: 6890, forecast: 6500 },
  { date: 'Sat', actual: 8390, forecast: 8100 },
  { date: 'Sun', actual: 7490, forecast: 7600 },
];

export default function OverviewPage() {
  return (
    <div>
      <div className="grid-kpi">
        <div className="kpi-card">
          <div className="kpi-title">Total Demand Forecast (7D)</div>
          <div className="kpi-value">37,200 <span style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)', fontWeight: 'normal' }}>+12%</span></div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Units across all active SKUs</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Stockout Risk SKUs</div>
          <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>14</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Requires immediate reordering</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Forecast Accuracy (WMAPE)</div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>88.4%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Within target error margins</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Overstock Tied Capital</div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>₹2.4L</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Potential holding cost risk</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Demand Trajectory vs. Model Forecast</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Comparing daily aggregated sales against baseline predictions</p>
          </div>
        </div>
        <div style={{ height: 320, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: 8 }} 
              />
              <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={0} strokeWidth={2} name="Actual Sales" />
              <Area type="monotone" dataKey="forecast" stroke="#3b82f6" fill="url(#forecastGrad)" strokeWidth={2} name="Forecast" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
