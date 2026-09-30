import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  TrendingUp,
  Boxes,
  Coins,
  Grid3X3,
  Flame,
  ShoppingCart,
  CheckSquare,
  Truck,
  LineChart,
  Tag,
  ShieldCheck,
  Bot,
  LogOut,
  Zap,
  Sliders,
  Calendar,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBusinessMode } from '../../context/BusinessModeContext';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Data',
    items: [
      { name: 'Data Upload', path: '/upload', icon: UploadCloud },
      { name: 'Data Health', path: '/quality', icon: ShieldCheck },
    ],
  },
  {
    title: 'Forecasting',
    items: [
      { name: 'Forecast Studio', path: '/forecast', icon: TrendingUp },
      { name: 'What-If Simulator', path: '/simulator', icon: Sliders },
      { name: 'Festival Calendar', path: '/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Inventory & Buying',
    items: [
      { name: 'Stock Health', path: '/inventory', icon: Boxes },
      { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart },
      { name: 'Budget Planner', path: '/budget-planner', icon: Coins },
      { name: 'Action Recommendations', path: '/recommendations', icon: CheckSquare },
      { name: 'Stock Transfers', path: '/transfers', icon: Truck },
      { name: 'Dead Stock Recovery', path: '/dead-stock', icon: Flame },
      { name: 'ABC-XYZ Segmentation', path: '/abc-xyz', icon: Grid3X3 },
    ],
  },
  {
    title: 'Insights',
    items: [
      { name: 'AI Advisor', path: '/assistant', icon: Bot },
      { name: 'Sales Trends', path: '/trends', icon: LineChart },
      { name: 'Price Insights', path: '/price-insights', icon: Tag },
      { name: 'Market Rates', path: '/market-prices', icon: Zap },
    ],
  },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const sectionsToRender = NAV_SECTIONS;

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div className="sidebar-brand">
        <TrendingUp size={22} color="var(--accent-primary)" />
        <span style={{ fontWeight: 700, fontSize: '16px' }}>DemandIQ</span>
      </div>

      {/* Grouped Navigation */}
      <nav className="sidebar-nav">
        {sectionsToRender.map((section) => (
          <div key={section.title} style={{ marginBottom: '8px' }}>
            <div className="sidebar-section-label">
              {section.title}
            </div>
            {section.items.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span>{name}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Footer with Logout */}
      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 10px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--status-critical-bg)';
            e.currentTarget.style.color = 'var(--status-critical-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
