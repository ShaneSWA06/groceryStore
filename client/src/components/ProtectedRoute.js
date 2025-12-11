import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    // Redirect to appropriate login based on required role
    if (requiredRole === 'admin') {
      return <Navigate to="/admin-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // If admin route but user is not admin, redirect to admin login
    if (requiredRole === 'admin') {
      return <Navigate to="/admin-login" replace />;
    }
    return <Navigate to="/cashier" replace />;
  }

  return children;
}

export default ProtectedRoute;

