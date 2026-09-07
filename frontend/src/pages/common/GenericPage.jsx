import React from 'react';

export default function GenericPage({ title, description }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{description}</p>
      <div 
        style={{ 
          padding: '2rem', 
          backgroundColor: 'var(--bg-main)', 
          borderRadius: 8, 
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem'
        }}
      >
        Module scaffolded and ready for implementation. API endpoints defined in API spec can be bound here.
      </div>
    </div>
  );
}
