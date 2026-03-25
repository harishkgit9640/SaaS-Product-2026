import { Outlet } from 'react-router-dom';
import {
  HiChartBarSquare,
  HiDocumentText,
  HiCreditCard,
} from 'react-icons/hi2';
import Sidebar from './Sidebar';
import Header from './Header';
import type { NavItem } from './Sidebar';

const memberNav: NavItem[] = [
  { label: 'Dashboard', to: '/member', icon: <HiChartBarSquare className="h-5 w-5" /> },
  { label: 'Invoices', to: '/member/invoices', icon: <HiDocumentText className="h-5 w-5" /> },
  { label: 'Payments', to: '/member/payments', icon: <HiCreditCard className="h-5 w-5" /> },
];

export default function MemberLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar items={memberNav} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
