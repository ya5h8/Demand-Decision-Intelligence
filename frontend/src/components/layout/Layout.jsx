import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const titleMap = {
  '/dashboard': 'Dashboard Overview',
  '/upload': 'Data Ingestion & Validation',
  '/forecast': 'Demand Forecasting Engine',
  '/inventory': 'Inventory Intelligence & Risk',
  '/trends': 'Trend Analysis & Anomalies',
  '/price-insights': 'Price Insights & Elasticity',
  '/evaluation': 'Model Performance Evaluation',
  '/assistant': 'AI Decision Assistant',
};

export default function Layout() {
  const location = useLocation();
  const pageTitle = titleMap[location.pathname] || 'Demand Decision Intelligence';

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-area">
        <Header title={pageTitle} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
