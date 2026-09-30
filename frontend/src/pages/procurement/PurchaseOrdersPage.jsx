import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Mail,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  X,
  Loader2,
  Truck,
  Sliders,
  Search,
} from 'lucide-react';
import {
  PageShell,
  PageHeader,
  Card,
  StatusBadge,
  EmptyState,
} from '../../components/ui';
import { UpdateLeadTimeModal } from '../forecast/components/UpdateLeadTimeModal';
import { getProductName } from '../../utils/productNames';

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'catalog'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedSkuForModal, setSelectedSkuForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptQuantities, setReceiptQuantities] = useState({});
  const [learningResult, setLearningResult] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchase-orders');
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data.purchase_orders || []);
      }
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/purchase-orders/catalog-lead-times');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.catalog || []);
      }
    } catch (err) {
      console.error('Failed to load supplier lead times:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeTab]);

  const handleGeneratePOs = async () => {
    setGenerating(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/purchase-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`Created ${data.created_orders_count} new purchase order(s).`);
        fetchPOs();
      }
    } catch (err) {
      console.error('Failed to generate POs:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailSupplier = async (poId) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/email?dry_run=true`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`Email preview sent to: ${data.recipient}. Order marked as sent.`);
        fetchPOs();
      }
    } catch (err) {
      console.error('Failed to email supplier:', err);
    }
  };

  const openReceiptModal = async (poId) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPo(data);
        const initialQtys = {};
        (data.lines || []).forEach(l => {
          initialQtys[l.id] = l.quantity_ordered - l.quantity_received;
        });
        setReceiptQuantities(initialQtys);
        setLearningResult(null);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch PO details:', err);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!selectedPo) return;
    const lines = Object.entries(receiptQuantities).map(([lineId, qty]) => ({
      po_line_id: parseInt(lineId),
      quantity: parseInt(qty) || 0,
      condition_notes: 'Inspected and verified'
    }));

    try {
      const res = await fetch(`/api/purchase-orders/${selectedPo.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, notes: 'Standard goods receipt log' })
      });
      if (res.ok) {
        const data = await res.json();
        setLearningResult(data);
        fetchPOs();
      }
    } catch (err) {
      console.error('Failed to record receipt:', err);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'received': return { variant: 'success', label: 'Received' };
      case 'issued': return { variant: 'info', label: 'Sent to Supplier' };
      case 'draft': return { variant: 'neutral', label: 'Draft' };
      default: return { variant: 'neutral', label: status || 'Draft' };
    }
  };

  return (
    <PageShell>
      <PageHeader
        icon={ShoppingBag}
        title="Purchase Orders"
        subtitle="Create and manage orders to your suppliers. Track delivery and record goods received."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={fetchPOs} className="diq-btn diq-btn-secondary" disabled={loading}>
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleGeneratePOs}
              disabled={generating}
              className="diq-btn diq-btn-primary"
              style={{ opacity: generating ? 0.5 : 1 }}
            >
              {generating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><PlusCircle size={14} /> Create Orders</>}
            </button>
          </div>
        }
      />

      {/* Success message */}
      {actionMessage && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--border-radius-md)', marginBottom: '16px',
          backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)',
          color: 'var(--status-success-text)', fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <CheckCircle2 size={16} /> {actionMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`diq-btn ${activeTab === 'orders' ? 'diq-btn-primary' : 'diq-btn-secondary'}`}
        >
          <FileText size={14} /> Active Orders ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`diq-btn ${activeTab === 'catalog' ? 'diq-btn-primary' : 'diq-btn-secondary'}`}
        >
          <Truck size={14} /> Supplier Lead Times & Catalog
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Catalog Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search products or suppliers..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 32px',
                  borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-subtle, #cbd5e1)',
                  fontSize: '13px', background: '#ffffff',
                }}
              />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {catalog.filter(c => !catalogSearch || c.product_name.toLowerCase().includes(catalogSearch.toLowerCase()) || c.product_id.toLowerCase().includes(catalogSearch.toLowerCase())).length} SKU(s)
            </div>
          </div>

          {catalogLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block', color: 'var(--accent-primary)' }} />
              Loading supplier lead times catalog...
            </div>
          ) : catalog.length === 0 ? (
            <Card>
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No SKUs found in active dataset.
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle, #e2e8f0)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>SKU / Product</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Delivery Turnaround</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Warehouse Stock</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog
                      .filter(c => !catalogSearch || c.product_name.toLowerCase().includes(catalogSearch.toLowerCase()) || c.product_id.toLowerCase().includes(catalogSearch.toLowerCase()))
                      .map((item) => (
                        <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.product_id} · {item.category}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontWeight: 700, color: item.is_configured ? '#4338ca' : '#64748b',
                              background: item.is_configured ? '#eef2ff' : '#f1f5f9',
                              padding: '2px 8px', borderRadius: '4px'
                            }}>
                              <Truck size={12} /> {item.lead_time_days} days
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>
                            {item.current_stock > 0 ? `${item.current_stock.toLocaleString()} units` : <span style={{ color: '#94a3b8' }}>Unspecified</span>}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {item.is_configured ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                                <CheckCircle2 size={11} /> Verified SLA
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#92400e', background: '#fffbeb', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #fde68a' }}>
                                <AlertCircle size={11} /> Simulated (7d)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSelectedSkuForModal({
                                  sku: item.product_id,
                                  name: item.product_name,
                                  leadTime: item.lead_time_days,
                                  stock: item.current_stock,
                                  isConfigured: item.is_configured,
                                });
                                setIsModalOpen(true);
                              }}
                              className="diq-btn diq-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              <Sliders size={12} /> Update
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading orders...</div>
        ) : purchaseOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchase orders yet"
            description="Click 'Create Orders' to automatically generate purchase orders based on products that need restocking."
            actionLabel="Create Orders"
            onAction={handleGeneratePOs}
          />
        ) : (
          purchaseOrders.map(po => {
            const sc = getStatusConfig(po.status);
            return (
              <Card key={po.id}>
                {/* PO Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700 }}>{po.po_number}</span>
                      <StatusBadge variant={sc.variant} label={sc.label} size="sm" />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>Order Date: <strong style={{ color: 'var(--text-primary)' }}>{po.created_at ? new Date(po.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></span>
                      <span>Expected Delivery: <strong style={{ color: 'var(--text-primary)' }}>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Standard (7 Days)'}</strong></span>
                      <span>Total Items: <strong style={{ color: 'var(--accent-primary)' }}>{po.line_count || 1} product(s)</strong></span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: 'var(--status-success-text)' }}>
                      ₹{po.total_value?.toLocaleString('en-IN') || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Order Total Amount</div>
                  </div>
                </div>

                {po.notes && (
                  <div style={{
                    marginTop: '12px', padding: '8px 12px', borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)',
                    color: 'var(--status-warning-text)', fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <AlertCircle size={14} /> {po.notes}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a
                      href={`/api/purchase-orders/${po.id}/pdf`}
                      download
                      className="diq-btn diq-btn-secondary diq-btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <FileText size={13} /> Download PDF
                    </a>
                    <a
                      href={`/api/purchase-orders/${po.id}/csv`}
                      download
                      className="diq-btn diq-btn-secondary diq-btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <Download size={13} /> Export Excel / CSV
                    </a>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {po.status !== 'issued' && po.status !== 'received' && (
                      <button onClick={() => handleEmailSupplier(po.id)} className="diq-btn diq-btn-secondary diq-btn-sm">
                        <CheckCircle2 size={13} /> Confirm & Issue Order
                      </button>
                    )}
                    {po.status !== 'received' && (
                      <button onClick={() => openReceiptModal(po.id)} className="diq-btn diq-btn-primary diq-btn-sm">
                        <PackageCheck size={13} /> Record Delivery
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
        </div>
      )}

      {/* ── Goods Receipt Modal ── */}
      {receiptModalOpen && selectedPo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '12px', maxWidth: '640px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-dropdown)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Record Goods Received</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order: {selectedPo.po_number}</p>
              </div>
              <button onClick={() => setReceiptModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {!learningResult ? (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Enter the quantity received for each item. The system will automatically update delivery time tracking.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {selectedPo.lines?.map(line => (
                    <div key={line.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', backgroundColor: 'var(--bg-surface-subtle)',
                      borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-subtle)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {getProductName(line.product_id, line.product_name)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          SKU: {line.product_id}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Ordered: {line.quantity_ordered} units | Received: {line.quantity_received} units
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Received:</label>
                        <input
                          type="number"
                          value={receiptQuantities[line.id] ?? ''}
                          onChange={(e) => setReceiptQuantities({ ...receiptQuantities, [line.id]: e.target.value })}
                          min="0"
                          style={{
                            width: '80px', textAlign: 'right', padding: '4px 8px',
                            border: '1px solid var(--border-strong)', borderRadius: 'var(--border-radius-sm)',
                            fontSize: '13px', fontFamily: 'var(--font-mono)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => setReceiptModalOpen(false)} className="diq-btn diq-btn-secondary">Cancel</button>
                  <button onClick={handleSubmitReceipt} className="diq-btn diq-btn-primary">Confirm Receipt</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  padding: '12px 14px', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)',
                  borderRadius: 'var(--border-radius-md)', color: 'var(--status-success-text)', fontSize: '13px', marginBottom: '16px',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong>Receipt recorded successfully!</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                      Delivery times have been measured and safety stock levels recalculated.
                    </p>
                  </div>
                </div>

                {learningResult.learning_results?.map((res, i) => (
                  <div key={i} style={{
                    padding: '12px', backgroundColor: 'var(--bg-surface-subtle)',
                    borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-subtle)',
                    marginBottom: '8px', fontSize: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '6px' }}>
                      <span>{getProductName(res.product_id, res.product_name)} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>(SKU: {res.product_id})</span></span>
                      <span style={{ color: 'var(--status-warning-text)' }}>
                        Actual: {res.actual_lead_time_days}d (Promised: {res.promised_lead_time_days}d)
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Delivery variability:</span> <span style={{ fontFamily: 'var(--font-mono)' }}>{res.learned_sigma_lead_time} days</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Updated safety stock:</span> <strong style={{ color: 'var(--accent-primary)' }}>{res.calibrated_safety_stock} units</strong> ({res.safety_stock_delta_units >= 0 ? '+' : ''}{res.safety_stock_delta_units})</div>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => { setReceiptModalOpen(false); setLearningResult(null); }} className="diq-btn diq-btn-primary">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Supplier Lead Time Calibration Modal ── */}
      {selectedSkuForModal && (
        <UpdateLeadTimeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSkuForModal(null);
          }}
          sku={selectedSkuForModal.sku}
          skuName={selectedSkuForModal.name}
          currentLeadTime={selectedSkuForModal.leadTime}
          currentStock={selectedSkuForModal.stock}
          isConfigured={selectedSkuForModal.isConfigured}
          onSuccess={() => {
            fetchCatalog();
            fetchPOs();
          }}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </PageShell>
  );
}
