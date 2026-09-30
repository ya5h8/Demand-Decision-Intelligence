import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BusinessModeProvider } from './context/BusinessModeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OverviewPage from './pages/dashboard/OverviewPage';
import UploadPage from './pages/upload/UploadPage';
import ForecastPage from './pages/forecast/ForecastPage';
import InventoryPage from './pages/inventory/InventoryPage';
import TrendsPage from './pages/trends/TrendsPage';
import PriceInsightsPage from './pages/pricing/PriceInsightsPage';
import MarketPricesPage from './pages/pricing/MarketPricesPage';
import PurchaseOrdersPage from './pages/procurement/PurchaseOrdersPage';
import RecommendationsPage from './pages/recommendations/RecommendationsPage';
import TransfersPage from './pages/transfers/TransfersPage';
import BudgetAllocatorPage from './pages/inventory/BudgetAllocatorPage';
import AbcXyzPage from './pages/classification/AbcXyzPage';
import DeadStockPage from './pages/inventory/DeadStockPage';
import FestivalCalendarPage from './pages/calendar/FestivalCalendarPage';
import WhatIfSimulatorPage from './pages/simulator/WhatIfSimulatorPage';
import AssistantPage from './pages/assistant/AssistantPage';
import SkuDetailPage from './pages/inventory/SkuDetailPage';
import DataQualityScorecardPage from './pages/quality/DataQualityScorecardPage';
import GenericPage from './pages/common/GenericPage';
import './styles/main.css';

export default function App() {
  return (
    <AuthProvider>
      <BusinessModeProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected App Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/budget-planner" element={<BudgetAllocatorPage />} />
            <Route path="/simulator" element={<WhatIfSimulatorPage />} />
            <Route path="/calendar" element={<FestivalCalendarPage />} />
            <Route path="/abc-xyz" element={<AbcXyzPage />} />
            <Route path="/dead-stock" element={<DeadStockPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/transfers" element={<TransfersPage />} />

            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/price-insights" element={<PriceInsightsPage />} />
            <Route path="/market-prices" element={<MarketPricesPage />} />
            <Route path="/evaluation" element={<ForecastPage />} />

            {/* Detailed Feature Routes */}
            <Route path="/sku/:productId" element={<SkuDetailPage />} />
            <Route path="/quality" element={<DataQualityScorecardPage />} />
            <Route path="/model-performance" element={<Navigate to="/forecast" replace />} />
            <Route path="/procurement" element={<Navigate to="/purchase-orders" replace />} />
            <Route path="/classification" element={<Navigate to="/abc-xyz" replace />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </BusinessModeProvider>
    </AuthProvider>
  );
}
