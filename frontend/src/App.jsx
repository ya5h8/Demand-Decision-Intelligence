import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import OverviewPage from './pages/dashboard/OverviewPage';
import UploadPage from './pages/upload/UploadPage';
import GenericPage from './pages/common/GenericPage';
import './styles/main.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route 
            path="/forecast" 
            element={<GenericPage title="Demand Forecast" description="Multi-horizon demand predictions using statistical, ML, and Prophet models." />} 
          />
          <Route 
            path="/inventory" 
            element={<GenericPage title="Inventory Intelligence" description="Safety stock recommendations, reorder point calculations, and stockout risk alerts." />} 
          />
          <Route 
            path="/trends" 
            element={<GenericPage title="Trends & Anomalies" description="Spike and drop detection, seasonal pattern analysis, and sales anomalies." />} 
          />
          <Route 
            path="/price-insights" 
            element={<GenericPage title="Price Insights" description="Price elasticity modeling and optimal discount recommendations." />} 
          />
          <Route 
            path="/evaluation" 
            element={<GenericPage title="Forecast Evaluation" description="Backtesting reports, WMAPE/RMSE metrics, and drift monitoring." />} 
          />
          <Route 
            path="/assistant" 
            element={<GenericPage title="AI Decision Assistant" description="RAG-grounded natural language Q&A across sales, inventory, and forecasts." />} 
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
