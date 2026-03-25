import { HiExclamationTriangle } from 'react-icons/hi2';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
        <HiExclamationTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Error</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm">
          Try Again
        </button>
      )}
    </div>
  );
}
