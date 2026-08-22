import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../pages/AccessDenied';

interface ProtectedRouteProps {
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
