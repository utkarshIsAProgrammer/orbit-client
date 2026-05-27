import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-orbit-bg flex flex-col items-center justify-center">
        <div className="relative w-12 h-12 rounded-full border border-orbit-accent/40 flex items-center justify-center">
          <div className="w-full h-full rounded-full border-2 border-orbit-accent border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-xs text-orbit-muted font-mono tracking-widest uppercase">Calculating trajectories...</p>
      </div>
    );
  }

  if (!user) {
    // Redirection to login with location query so they return easily
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
