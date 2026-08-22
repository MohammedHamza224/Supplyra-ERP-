import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';

import ProductsList from './pages/products/ProductsList';
import SuppliersList from './pages/suppliers/SuppliersList';
import CustomersList from './pages/customers/CustomersList';
import WarehousesList from './pages/warehouses/WarehousesList';
import UsersList from './pages/users/UsersList';
import InventoryList from './pages/inventory/InventoryList';
import PurchasesList from './pages/purchases/PurchasesList';
import SalesList from './pages/sales/SalesList';

import Dashboard from './pages/dashboard/Dashboard';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import AIAssistant from './pages/ai-assistant/AIAssistant';
import Settings from './pages/settings/Settings';

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
          
          <Route path="/" element={<AuthGuard><AppShell><Outlet /></AppShell></AuthGuard>}>
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
