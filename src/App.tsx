import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy Loaded Route Chunks for Maximum Initial Load Speed & Performance
const ProductsList = lazy(() => import('./pages/products/ProductsList'));
const SuppliersList = lazy(() => import('./pages/suppliers/SuppliersList'));
const CustomersList = lazy(() => import('./pages/customers/CustomersList'));
const WarehousesList = lazy(() => import('./pages/warehouses/WarehousesList'));
const UsersList = lazy(() => import('./pages/users/UsersList'));
const InventoryList = lazy(() => import('./pages/inventory/InventoryList'));
const PurchasesList = lazy(() => import('./pages/purchases/PurchasesList'));
const SalesList = lazy(() => import('./pages/sales/SalesList'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const AIAssistant = lazy(() => import('./pages/ai-assistant/AIAssistant'));
const Settings = lazy(() => import('./pages/settings/Settings'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '14px',
    color: 'var(--color-text-secondary)'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid var(--color-border)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
      {document.documentElement.dir === 'rtl' ? 'جاري التحميل...' : 'Loading...'}
    </span>
  </div>
);

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const LoginRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/" element={<AuthGuard><AppShell><Suspense fallback={<PageLoader />}><Outlet /></Suspense></AppShell></AuthGuard>}>
            <Route index element={<Dashboard />} />
            
            <Route element={<ProtectedRoute requiredPermission="products.view" />}>
              <Route path="products" element={<ProductsList />} />
            </Route>
            
            <Route element={<ProtectedRoute requiredPermission="suppliers.view" />}>
              <Route path="suppliers" element={<SuppliersList />} />
            </Route>
            
            <Route element={<ProtectedRoute requiredPermission="customers.view" />}>
              <Route path="customers" element={<CustomersList />} />
            </Route>
            
            <Route element={<ProtectedRoute requiredPermission="warehouses.view" />}>
              <Route path="warehouses" element={<WarehousesList />} />
            </Route>
            
            <Route element={<ProtectedRoute requiredPermission="users.view" />}>
              <Route path="users" element={<UsersList />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="products.view" />}>
              <Route path="inventory" element={<InventoryList />} />
            </Route>
            
            <Route element={<ProtectedRoute requiredPermission="purchases.view" />}>
              <Route path="purchases" element={<PurchasesList />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="sales.view" />}>
              <Route path="sales" element={<SalesList />} />
            </Route>
            
            
            <Route element={<ProtectedRoute requiredPermission="analytics.view" />}>
              <Route path="analytics" element={<AnalyticsDashboard />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="ai.view" />}>
              <Route path="ai-assistant" element={<AIAssistant />} />
            </Route>

            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
