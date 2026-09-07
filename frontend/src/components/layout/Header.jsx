import React from 'react';
import { User, Bell } from 'lucide-react';

export default function Header({ title = 'Dashboard Overview' }) {
  return (
    <header className="top-navbar">
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer' 
          }}
          title="Notifications"
        >
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div 
            style={{ 
              width: 34, 
              height: 34, 
              borderRadius: '50%', 
              backgroundColor: 'var(--accent-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff'
            }}
          >
            <User size={18} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Manager</span>
        </div>
      </div>
    </header>
  );
}
