import React from 'react';
import { UploadCloud, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  return (
    <div>
      <div className="card" style={{ border: '2px dashed var(--border-strong)', textAlign: 'center', padding: '3rem 2rem' }}>
        <UploadCloud size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Upload Sales & Inventory Datasets</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Drag and drop your raw CSV files or browse your local directory.
        </p>
        <button className="btn btn-primary">Browse Files</button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Dataset Validation Checklist</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>Product ID Mapping & Catalog Alignment</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>Missing Date Imputation & Continuous Frequency</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <AlertCircle size={18} color="#f59e0b" />
            <span>Negative or Outlier Price Checks (Pre-processing filter)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
