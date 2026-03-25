import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const redirect = user.role === 'Admin' ? '/admin' : '/member';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
