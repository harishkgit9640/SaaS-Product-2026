import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useUiStore } from '@/stores';
import { ProtectedRoute, AdminLayout, MemberLayout } from '@/components/layout';

import LoginPage from '@/pages/auth/LoginPage';
import AdminDashboard from '@/pages/admin/DashboardPage';
import MembersPage from '@/pages/admin/MembersPage';
import PlansPage from '@/pages/admin/PlansPage';
import AdminInvoicesPage from '@/pages/admin/InvoicesPage';
import DefaultersPage from '@/pages/admin/DefaultersPage';
import MemberDashboard from '@/pages/member/DashboardPage';
import MemberInvoicesPage from '@/pages/member/InvoicesPage';
import PaymentPage from '@/pages/member/PaymentPage';
import ReceiptPage from '@/pages/member/ReceiptPage';

export default function App() {
  const { isAuthenticated, user, hydrate } = useAuthStore();
  const { initDarkMode } = useUiStore();

  useEffect(() => {
    hydrate();
    initDarkMode();
  }, [hydrate, initDarkMode]);

  const homeRedirect = () => {
    if (!isAuthenticated) return '/login';
    return user?.role === 'Admin' ? '/admin' : '/member';
  };

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={user?.role === 'Admin' ? '/admin' : '/member'} replace /> : <LoginPage />
      } />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="invoices" element={<AdminInvoicesPage />} />
        <Route path="defaulters" element={<DefaultersPage />} />
      </Route>

      {/* Member Routes */}
      <Route
        path="/member"
        element={
          <ProtectedRoute allowedRoles={['Member']}>
            <MemberLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MemberDashboard />} />
        <Route path="invoices" element={<MemberInvoicesPage />} />
        <Route path="payments" element={<PaymentPage />} />
        <Route path="receipt/:invoiceId" element={<ReceiptPage />} />
      </Route>

      <Route path="*" element={<Navigate to={homeRedirect()} replace />} />
    </Routes>
  );
}
