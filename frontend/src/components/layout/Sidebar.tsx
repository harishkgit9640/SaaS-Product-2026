import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { HiXMark } from 'react-icons/hi2';
import { useUiStore } from '@/stores';
import type { ReactNode } from 'react';

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  title?: string;
}

export default function Sidebar({ items, title = 'FeeAutomate' }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
            )
          }
        >
          <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-950 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
              F
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
