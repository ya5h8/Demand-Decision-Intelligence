import React from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)'
    }}>
      <div className="card" style={{ width: 400, padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
          DemandIQ Login
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', textAlign: 'center' }}>
          Sign in to access demand intelligence & forecasts
        </p>
        <form onSubmit={(e) => e.preventDefault()}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Email or Username
            </label>
            <input
              type="text"
              placeholder="user@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              Sign In
            </button>
          </Link>
        </form>
      </div>
    </div>
  );
}
