import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  TrendingUp, 
  Boxes, 
  LineChart, 
  Tag, 
  ShieldCheck, 
  Bot, 
  LogOut 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Upload', path: '/upload', icon: UploadCloud },
  { name: 'Forecast', path: '/forecast', icon: TrendingUp },
  { name: 'Inventory', path: '/inventory', icon: Boxes },
  { name: 'Trends', path: '/trends', icon: LineChart },
  { name: 'Price Insights', path: '/price-insights', icon: Tag },
  { name: 'Evaluation', path: '/evaluation', icon: ShieldCheck },
  { name: 'Assistant', path: '/assistant', icon: Bot },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <TrendingUp className="text-blue-500" size={24} color="#3b82f6" />
        <span>DemandIQ</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/login" className="nav-link" style={{ color: 'var(--text-muted)' }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </NavLink>
      </div>
    </aside>
  );
}
