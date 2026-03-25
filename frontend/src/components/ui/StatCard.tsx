import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  color?: 'primary' | 'green' | 'yellow' | 'red' | 'blue';
}

const iconBg = {
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  yellow: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function StatCard({ title, value, icon, trend, color = 'primary' }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend && (
            <p
              className={clsx(
                'mt-1 text-xs font-medium',
                trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {trend.positive ? '+' : ''}{trend.value}
            </p>
          )}
        </div>
        <div className={clsx('rounded-xl p-3', iconBg[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
