import { HiBars3, HiMoon, HiSun, HiArrowRightOnRectangle } from 'react-icons/hi2';
import { useAuthStore, useUiStore } from '@/stores';

export default function Header() {
  const { user, tenant, logout } = useAuthStore();
  const { toggleSidebar, darkMode, toggleDarkMode } = useUiStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
        >
          <HiBars3 className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {tenant?.name || 'FeeAutomate'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tenant?.code}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
        </button>

        <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-700">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Logout"
          >
            <HiArrowRightOnRectangle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
