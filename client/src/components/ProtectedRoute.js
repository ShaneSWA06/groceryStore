import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Wrong role — send them to their correct page
    return <Navigate to={user.role === 'admin' ? '/admin' : '/cashier'} replace />;
  }

  return children;
}

export default ProtectedRoute;
