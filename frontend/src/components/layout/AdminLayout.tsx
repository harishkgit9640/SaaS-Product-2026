import { Outlet } from 'react-router-dom';
import {
  HiChartBarSquare,
  HiUserGroup,
  HiCreditCard,
  HiDocumentText,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import Sidebar from './Sidebar';
import Header from './Header';
import type { NavItem } from './Sidebar';

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <HiChartBarSquare className="h-5 w-5" /> },
  { label: 'Members', to: '/admin/members', icon: <HiUserGroup className="h-5 w-5" /> },
  { label: 'Plans', to: '/admin/plans', icon: <HiCreditCard className="h-5 w-5" /> },
  { label: 'Invoices', to: '/admin/invoices', icon: <HiDocumentText className="h-5 w-5" /> },
  { label: 'Defaulters', to: '/admin/defaulters', icon: <HiExclamationTriangle className="h-5 w-5" /> },
];

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar items={adminNav} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
