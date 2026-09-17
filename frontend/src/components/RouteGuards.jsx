import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="app-loader"><div className="spinner" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="app-loader"><div className="spinner" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function GuestOnly({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <div className="app-loader"><div className="spinner" /></div>;
  if (isAuthenticated) return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  return children;
}
