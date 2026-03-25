import { HiInboxStack } from 'react-icons/hi2';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
        {icon || <HiInboxStack className="h-8 w-8 text-gray-400 dark:text-gray-500" />}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
