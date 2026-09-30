import React, { useState, useEffect } from 'react';
import {
  Grid3X3,
  Sliders,
  Sparkles,
  Package,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  TrendingUp,
  Settings2,
  X,
  Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const CELL_COLOR_MAP = {
  AX: { border: 'rgba(16, 185, 129, 0.4)', bg: 'rgba(16, 185, 129, 0.08)', text: '#34d399' },
  AY: { border: 'rgba(59, 130, 246, 0.4)', bg: 'rgba(59, 130, 246, 0.08)', text: '#60a5fa' },
  AZ: { border: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.08)', text: '#fbbf24' },
  BX: { border: 'rgba(59, 130, 246, 0.3)', bg: 'rgba(59, 130, 246, 0.05)', text: '#93c5fd' },
  BY: { border: 'rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.05)', text: '#fcd34d' },
  BZ: { border: 'rgba(239, 68, 68, 0.3)', bg: 'rgba(239, 68, 68, 0.05)', text: '#f87171' },
  CX: { border: 'rgba(148, 163, 184, 0.3)', bg: 'rgba(148, 163, 184, 0.05)', text: '#cbd5e1' },
  CY: { border: 'rgba(245, 158, 11, 0.25)', bg: 'rgba(245, 158, 11, 0.04)', text: '#fde68a' },
  CZ: { border: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
};

export default function AbcXyzPage() {
  const navigate = useNavigate();
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState('AX');
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [allSkus, setAllSkus] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'A' | 'B' | 'C' | specific cell e.g. 'AX'
  const [skuSearch, setSkuSearch] = useState('');

  // Policy tuning modal state
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState(null);
  const [policySaving, setPolicySaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadMatrix();
  }, []);

  useEffect(() => {
    if (selectedCell) {
      loadCellSkus(selectedCell);
    }
  }, [selectedCell]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classification/matrix');
      if (res?.data) {
        setMatrixData(res.data);
        
        // Fetch all SKUs from all active cells so user can see every product and filter by Grade A, B, C
        const cellsWithSkus = (res.data.cells || []).filter(c => c.sku_count > 0);
        if (cellsWithSkus.length > 0) {
          const promises = cellsWithSkus.map(c =>
            api.get(`/classification/skus?cell=${c.cell}&limit=200`)
              .then(r => (r.data?.skus || []).map(sku => ({
                ...sku,
                cell: c.cell,
                abc_class: c.abc_class,
                xyz_class: c.xyz_class,
                policy: r.data?.policy
              })))
              .catch(() => [])
          );
          const results = await Promise.all(promises);
          setAllSkus(results.flat());
        } else {
          setAllSkus([]);
        }
      }
    } catch (err) {
      console.error('Failed to load ABC-XYZ matrix', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCellSkus = async (cell) => {
    setDrilldownLoading(true);
    try {
      const res = await api.get(`/classification/skus?cell=${cell}&limit=100`);
      if (res?.data) {
        setDrilldownData(res.data);
        if (res.data.policy) {
          setPolicyForm({
            cell: cell,
            review_strategy: res.data.policy.review_strategy,
            target_service_level: res.data.policy.target_service_level,
            safety_stock_policy: res.data.policy.safety_stock_policy,
            reorder_automation: res.data.policy.reorder_automation,
            description: res.data.policy.description || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load cell SKUs', err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policyForm) return;
    setPolicySaving(true);
    try {
      await api.put(`/classification/policies/${policyForm.cell}`, {
        review_strategy: policyForm.review_strategy,
        target_service_level: Number(policyForm.target_service_level),
        safety_stock_policy: policyForm.safety_stock_policy,
        reorder_automation: policyForm.reorder_automation,
        description: policyForm.description,
      });
      setSuccessMessage(`Policy for Cell ${policyForm.cell} updated successfully!`);
      setShowPolicyModal(false);
      loadMatrix();
      loadCellSkus(selectedCell);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update policy', err);
    } finally {
      setPolicySaving(false);
    }
  };

  const grid = matrixData?.grid || { A: [], B: [], C: [] };
  const totalSkus = matrixData?.total_skus || 0;
  const totalVal = matrixData?.total_annual_value || 0;

  const gradeACells = grid.A || [];
  const gradeBCells = grid.B || [];
  const gradeCCells = grid.C || [];

  const gradeACount = gradeACells.reduce((acc, c) => acc + (c.sku_count || 0), 0);
  const gradeBCount = gradeBCells.reduce((acc, c) => acc + (c.sku_count || 0), 0);
  const gradeCCount = gradeCCells.reduce((acc, c) => acc + (c.sku_count || 0), 0);

  const gradeAVal = gradeACells.reduce((acc, c) => acc + (c.annual_consumption_value || 0), 0);
  const gradeBVal = gradeBCells.reduce((acc, c) => acc + (c.annual_consumption_value || 0), 0);
  const gradeCVal = gradeCCells.reduce((acc, c) => acc + (c.annual_consumption_value || 0), 0);

  // Filter products by Grade (A/B/C) or specific cell, and search query
  const displayedSkus = allSkus.filter((s) => {
    if (activeFilter === 'A') {
      if (s.abc_class !== 'A') return false;
    } else if (activeFilter === 'B') {
      if (s.abc_class !== 'B') return false;
    } else if (activeFilter === 'C') {
      if (s.abc_class !== 'C') return false;
    } else if (activeFilter !== 'ALL') {
      if (s.cell !== activeFilter) return false;
    }

    if (skuSearch) {
      const q = skuSearch.toLowerCase();
      const match =
        (s.product_name || '').toLowerCase().includes(q) ||
        (s.product_id || '').toLowerCase().includes(q) ||
        (s.brand_name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.cell || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Product Importance & Sales Stability (ABC-XYZ)
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
              <Grid3X3 size={13} /> 9 Store Categories
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            Automatically groups your products into 9 categories based on how much money they generate (A, B, C) and how regularly customers buy them (X, Y, Z).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => {
              loadMatrix();
              loadCellSkus(selectedCell);
            }}
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
            <RefreshCw size={15} /> Recalculate Matrix
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
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
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {/* Zero State Alert Banner */}
      {totalSkus === 0 && !loading && (
        <div style={{
          padding: '20px 24px',
          backgroundColor: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
              No Catalog Segmentation Data (0 SKUs)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Upload your retail sales CSV file to run automated ABC-XYZ Pareto value and volatility classification.
            </div>
          </div>
          <button onClick={() => navigate('/upload')} className="diq-btn diq-btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Download size={15} /> Upload Sales CSV
          </button>
        </div>
      )}

      {/* 3x3 Interactive Matrix Grid */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Store Classification Grid ({totalSkus} SKUs · ₹{Math.round(totalVal).toLocaleString()} Total Sales Value)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Click on any of the 9 boxes below to see which items belong to that category.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span><strong style={{ color: '#60a5fa' }}>X:</strong> Sells Daily (Steady)</span>
            <span><strong style={{ color: '#fbbf24' }}>Y:</strong> Sells in Waves</span>
            <span><strong style={{ color: '#f87171' }}>Z:</strong> Rare / Unpredictable</span>
          </div>
        </div>

        {/* 3x3 Grid Structure */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(3, 1fr)', gap: '0.75rem', alignItems: 'stretch' }}>
          {/* Column Headers */}
          <div></div>
          <div style={{ textAlign: 'center', fontWeight: 700, color: '#60a5fa', fontSize: '0.9rem', padding: '0.4rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px' }}>
            X (Sells Daily)
          </div>
          <div style={{ textAlign: 'center', fontWeight: 700, color: '#fbbf24', fontSize: '0.9rem', padding: '0.4rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px' }}>
            Y (Sells in Waves)
          </div>
          <div style={{ textAlign: 'center', fontWeight: 700, color: '#f87171', fontSize: '0.9rem', padding: '0.4rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px' }}>
            Z (Rare / Spikes)
          </div>

          {/* Row A */}
          {['A', 'B', 'C'].map((rowKey) => {
            const rowLabel = rowKey === 'A' ? 'A (Top 80% Revenue)' : rowKey === 'B' ? 'B (Mid 15% Revenue)' : 'C (Low 5% Revenue)';
            const rowCells = grid[rowKey] || [];

            return (
              <React.Fragment key={rowKey}>
                {/* Row Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}
                >
                  {rowLabel}
                </div>

                {/* 3 Cell Columns for this row */}
                {rowCells.map((cell) => {
                  const isSelected = selectedCell === cell.cell || activeFilter === cell.cell;
                  const styling = CELL_COLOR_MAP[cell.cell] || CELL_COLOR_MAP.AX;

                  return (
                    <div
                      key={cell.cell}
                      onClick={() => {
                        setSelectedCell(cell.cell);
                        setActiveFilter(cell.cell);
                      }}
                      style={{
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.18)' : styling.bg,
                        border: isSelected ? '2px solid #3b82f6' : `1px solid ${styling.border}`,
                        borderRadius: '10px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: styling.text }}>
                          {cell.cell}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          SL: {Math.round((cell.policy?.target_service_level || 0.95) * 100)}%
                        </span>
                      </div>

                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cell.sku_count} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>SKUs ({cell.sku_percentage}%)</span>
                      </div>

                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
                        ₹{Math.round(cell.annual_consumption_value).toLocaleString()}
                        <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>
                          ({cell.value_percentage}%)
                        </span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.2 }}>
                        {cell.policy?.description || `${cell.policy?.review_strategy} · ${cell.policy?.reorder_automation}`}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Simple Non-Technical Grade Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Grade A Card */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'A' ? 'ALL' : 'A')}
          style={{
            backgroundColor: activeFilter === 'A' ? 'rgba(16, 185, 129, 0.16)' : 'var(--bg-surface)',
            border: activeFilter === 'A' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '1.2rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilter === 'A' ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🟢 Grade A (VIP / Top Earners)
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {totalVal > 0 ? Math.round((gradeAVal / totalVal) * 100) : 0}% Sales
            </span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {gradeACount} Products
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)', marginLeft: '8px' }}>
              ₹{Math.round(gradeAVal).toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', lineHeight: 1.35 }}>
            Aapke store ke hero items jo lagbhag 80%+ kamai generate karte hain. Inka stock kabhi khatam nahi hona chahiye.
          </p>
          <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', fontWeight: 600, color: activeFilter === 'A' ? '#34d399' : 'var(--text-secondary)' }}>
            {activeFilter === 'A' ? '✓ Showing Grade A items below' : 'Click to view Grade A items →'}
          </div>
        </div>

        {/* Grade B Card */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'B' ? 'ALL' : 'B')}
          style={{
            backgroundColor: activeFilter === 'B' ? 'rgba(59, 130, 246, 0.16)' : 'var(--bg-surface)',
            border: activeFilter === 'B' ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '1.2rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilter === 'B' ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔵 Grade B (Regular Mid-Tier)
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {totalVal > 0 ? Math.round((gradeBVal / totalVal) * 100) : 0}% Sales
            </span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {gradeBCount} Products
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa', marginLeft: '8px' }}>
              ₹{Math.round(gradeBVal).toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', lineHeight: 1.35 }}>
            Normal regular bikne wale items jo 10-15% kamai dete hain. (Jaise Wireless Gaming Mouse & Streaming Webcam).
          </p>
          <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', fontWeight: 600, color: activeFilter === 'B' ? '#60a5fa' : 'var(--text-secondary)' }}>
            {activeFilter === 'B' ? '✓ Showing Grade B items below' : 'Click to view Grade B items →'}
          </div>
        </div>

        {/* Grade C Card */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'C' ? 'ALL' : 'C')}
          style={{
            backgroundColor: activeFilter === 'C' ? 'rgba(245, 158, 11, 0.16)' : 'var(--bg-surface)',
            border: activeFilter === 'C' ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            padding: '1.2rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilter === 'C' ? '0 0 15px rgba(245, 158, 11, 0.25)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚪ Grade C (Low Volume / Slow Moving)
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {totalVal > 0 ? Math.round((gradeCVal / totalVal) * 100) : 0}% Sales
            </span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {gradeCCount} Products
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24', marginLeft: '8px' }}>
              ₹{Math.round(gradeCVal).toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', lineHeight: 1.35 }}>
            Bohot kam bikne wale ya trial items (5% revenue). In par zyada stock ya cash block mat karein.
          </p>
          <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', fontWeight: 600, color: activeFilter === 'C' ? '#fbbf24' : 'var(--text-secondary)' }}>
            {activeFilter === 'C' ? '✓ Showing Grade C items below' : 'Click to view Grade C items →'}
          </div>
        </div>
      </div>

      {/* SKUs List & Filter Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: activeFilter === 'A' ? '#34d399' : activeFilter === 'B' ? '#60a5fa' : activeFilter === 'C' ? '#fbbf24' : '#60a5fa',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {activeFilter === 'ALL'
                  ? 'All Products'
                  : activeFilter === 'A'
                  ? 'Grade A'
                  : activeFilter === 'B'
                  ? 'Grade B'
                  : activeFilter === 'C'
                  ? 'Grade C'
                  : `Cell ${activeFilter}`}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {activeFilter === 'ALL'
                  ? `All Store Products (${displayedSkus.length} SKUs)`
                  : activeFilter === 'A'
                  ? `Grade A: Top 80% Money Makers (${displayedSkus.length} SKUs)`
                  : activeFilter === 'B'
                  ? `Grade B: Regular Mid-Tier Earners (${displayedSkus.length} SKUs)`
                  : activeFilter === 'C'
                  ? `Grade C: Low Volume Items (${displayedSkus.length} SKUs)`
                  : `Cell ${activeFilter} Products (${displayedSkus.length} SKUs)`}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
              {activeFilter === 'ALL'
                ? 'Neeche sabhi items diye gaye hain. Har item ke aage uska Grade (A, B ya C) saaf dikhega.'
                : activeFilter === 'A'
                ? 'Ye items sabse zaroori hain. Inki bikri daily aur sabse zyada hoti hai.'
                : activeFilter === 'B'
                ? 'Ye items regular chalne wale hain jo store ki 10-15% kamai banate hain.'
                : activeFilter === 'C'
                ? 'Ye items bohot kam bikte hain.'
                : `Viewing products and inventory parameters for Cell ${activeFilter}.`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={() => setShowPolicyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Settings2 size={15} /> Tune Policy for Cell {selectedCell}
            </button>
          </div>
        </div>

        {/* Filter Buttons & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Grade Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveFilter('ALL')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: activeFilter === 'ALL' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                backgroundColor: activeFilter === 'ALL' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === 'ALL' ? '#93c5fd' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🌟 All Products ({allSkus.length})
            </button>
            <button
              onClick={() => setActiveFilter('A')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: activeFilter === 'A' ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.2)',
                backgroundColor: activeFilter === 'A' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === 'A' ? '#34d399' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🟢 Grade A ({gradeACount})
            </button>
            <button
              onClick={() => setActiveFilter('B')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: activeFilter === 'B' ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.2)',
                backgroundColor: activeFilter === 'B' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === 'B' ? '#60a5fa' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔵 Grade B ({gradeBCount})
            </button>
            <button
              onClick={() => setActiveFilter('C')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: activeFilter === 'C' ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.2)',
                backgroundColor: activeFilter === 'C' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === 'C' ? '#fbbf24' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ⚪ Grade C ({gradeCCount})
            </button>

            {/* If filtered by specific cell like 'AX', 'BX' */}
            {activeFilter !== 'ALL' && activeFilter !== 'A' && activeFilter !== 'B' && activeFilter !== 'C' && (
              <button
                onClick={() => setActiveFilter('ALL')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  color: '#93c5fd',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                Cell {activeFilter} ({displayedSkus.length}) <X size={13} />
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search product name, code, brand..."
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.8rem 0.5rem 2.1rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.84rem'
              }}
            />
          </div>
        </div>

        {/* SKUs Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>SKU Code</th>
                <th style={{ padding: '0.75rem' }}>Product Name</th>
                <th style={{ padding: '0.75rem' }}>Grade & Category</th>
                <th style={{ padding: '0.75rem' }}>Brand / Department</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Annual Sales Value</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Daily Sales</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Sales Regularity</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Unit Cost</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Restock Policy</th>
              </tr>
            </thead>
            <tbody>
              {displayedSkus.map((sku) => {
                const isGradeA = sku.abc_class === 'A';
                const isGradeB = sku.abc_class === 'B';

                return (
                  <tr
                    key={sku.product_id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                      #{sku.product_id}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {sku.product_name}
                    </td>
                    <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                      {isGradeA ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}
                        >
                          🟢 Grade A (Top Earner) · Cell {sku.cell}
                        </span>
                      ) : isGradeB ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}
                        >
                          🔵 Grade B (Steady Mid) · Cell {sku.cell}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}
                        >
                          ⚪ Grade C (Low Volume) · Cell {sku.cell}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {sku.brand_name} · <span style={{ color: 'var(--text-muted)' }}>{sku.category}</span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)', whiteSpace: 'nowrap' }}>
                      ₹{Math.round(sku.annual_consumption_value).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {sku.mean_daily_demand.toLocaleString()} / day
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: Number(sku.cv2) < 0.25 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: Number(sku.cv2) < 0.25 ? '#10b981' : '#f59e0b',
                          fontWeight: 600,
                        }}
                      >
                        {Number(sku.cv2) < 0.25 ? 'Steady (Daily)' : Number(sku.cv2) < 1.0 ? 'Variable' : 'Irregular'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-cyan)', whiteSpace: 'nowrap' }}>
                      ₹{sku.unit_cost.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {sku.policy?.reorder_automation || drilldownData?.policy?.reorder_automation || 'AUTOMATED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {displayedSkus.length === 0 && !drilldownLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No products found matching the current filter.
            </div>
          )}
        </div>
      </div>

      {/* Policy Tuning Modal */}
      {showPolicyModal && policyForm && (
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
              padding: '1.5rem',
              width: '100%',
              maxWidth: '520px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings2 size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tune Policy: Cell {policyForm.cell}
                </h3>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Service Level */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Target Service Level
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  {Math.round(policyForm.target_service_level * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={policyForm.target_service_level}
                onChange={(e) => setPolicyForm({ ...policyForm, target_service_level: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Review Strategy */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Review Strategy
              </label>
              <select
                value={policyForm.review_strategy}
                onChange={(e) => setPolicyForm({ ...policyForm, review_strategy: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="CONTINUOUS">Continuous Review (Real-time trigger)</option>
                <option value="PERIODIC">Periodic Review (Weekly / Bi-weekly)</option>
                <option value="MIN_MAX">Min/Max Buffer Review</option>
                <option value="MAKE_TO_ORDER">Make to Order / Do Not Stock</option>
              </select>
            </div>

            {/* Reorder Automation */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Reorder Automation Rule
              </label>
              <select
                value={policyForm.reorder_automation}
                onChange={(e) => setPolicyForm({ ...policyForm, reorder_automation: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="AUTOMATED">Automated Reorder (Direct draft generation)</option>
                <option value="MANUAL_APPROVAL">Manual Approval Required</option>
                <option value="HUMAN_REVIEW">Strategic Human Review Required</option>
                <option value="DO_NOT_STOCK">Do Not Hold Stock / Delist</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Policy Description & Notes
              </label>
              <textarea
                value={policyForm.description}
                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => setShowPolicyModal(false)}
                style={{
                  padding: '0.55rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={policySaving}
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
                {policySaving ? 'Saving...' : 'Save Policy Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
