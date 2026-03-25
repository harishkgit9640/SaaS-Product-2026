import { useEffect, useMemo } from 'react';
import { HiDocumentText, HiCurrencyRupee, HiClock, HiCheckCircle } from 'react-icons/hi2';
import { useInvoiceStore, useAuthStore } from '@/stores';
import { StatCard, Card, LoadingScreen, ErrorState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';

export default function MemberDashboard() {
  const { user } = useAuthStore();
  const { invoices, fetchInvoices, isLoading, error } = useInvoiceStore();

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((i) => i.status === 'paid');
    const pending = invoices.filter((i) => i.status === 'pending');
    const overdue = invoices.filter((i) => i.status === 'overdue');
    const totalPaid = paid.reduce((sum, i) => sum + i.amountCents, 0);
    const totalPending = [...pending, ...overdue].reduce((sum, i) => sum + i.amountCents, 0);

    return { total, paidCount: paid.length, pendingCount: pending.length, overdueCount: overdue.length, totalPaid, totalPending };
  }, [invoices]);

  if (isLoading && invoices.length === 0) return <LoadingScreen message="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchInvoices} />;

  const upcomingInvoices = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={stats.total}
          icon={<HiDocumentText className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          icon={<HiCheckCircle className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(stats.totalPending)}
          icon={<HiClock className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Overdue"
          value={stats.overdueCount}
          icon={<HiCurrencyRupee className="h-6 w-6" />}
          color="red"
        />
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Upcoming Payments
        </h3>
        {upcomingInvoices.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You're all caught up! No pending invoices.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Due: {formatDate(inv.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(inv.amountCents)}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      inv.status === 'overdue'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
