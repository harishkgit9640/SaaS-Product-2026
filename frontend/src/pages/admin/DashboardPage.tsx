import { useEffect, useMemo } from 'react';
import {
  HiUserGroup,
  HiCreditCard,
  HiDocumentText,
  HiCurrencyRupee,
  HiExclamationTriangle,
  HiArrowTrendingUp,
} from 'react-icons/hi2';
import { useMemberStore, usePlanStore, useInvoiceStore } from '@/stores';
import { StatCard, Card, LoadingScreen, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';

export default function AdminDashboard() {
  const { members, fetchMembers, isLoading: membersLoading, error: membersError } = useMemberStore();
  const { plans, fetchPlans, isLoading: plansLoading } = usePlanStore();
  const { invoices, fetchInvoices, isLoading: invoicesLoading } = useInvoiceStore();

  useEffect(() => {
    fetchMembers();
    fetchPlans();
    fetchInvoices();
  }, [fetchMembers, fetchPlans, fetchInvoices]);

  const stats = useMemo(() => {
    const activeMembers = members.filter((m) => m.status === 'active').length;
    const activePlans = plans.filter((p) => p.status === 'active').length;
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const pendingInvoices = invoices.filter((i) => i.status === 'pending');
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.amountCents, 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const mrrInvoices = paidInvoices.filter((i) => {
      const d = new Date(i.paidAt || i.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const mrr = mrrInvoices.reduce((sum, i) => sum + i.amountCents, 0);

    return {
      totalMembers: members.length,
      activeMembers,
      activePlans,
      totalRevenue,
      pendingCount: pendingInvoices.length,
      overdueCount: overdueInvoices.length,
      mrr,
    };
  }, [members, plans, invoices]);

  const isLoading = membersLoading || plansLoading || invoicesLoading;

  if (isLoading && members.length === 0) return <LoadingScreen message="Loading dashboard..." />;
  if (membersError) return <ErrorState message={membersError} onRetry={fetchMembers} />;

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your organization's financials
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.mrr)}
          icon={<HiArrowTrendingUp className="h-6 w-6" />}
          color="primary"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<HiCurrencyRupee className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          icon={<HiUserGroup className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Active Plans"
          value={stats.activePlans}
          icon={<HiCreditCard className="h-6 w-6" />}
          color="primary"
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pendingCount}
          icon={<HiDocumentText className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Overdue Invoices"
          value={stats.overdueCount}
          icon={<HiExclamationTriangle className="h-6 w-6" />}
          color="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Invoices
          </h3>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Due: {new Date(inv.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(inv.amountCents)}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        inv.status === 'paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : inv.status === 'overdue'
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

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Active Members</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stats.activeMembers} / {stats.totalMembers}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-primary-600 transition-all"
                style={{
                  width: `${stats.totalMembers ? (stats.activeMembers / stats.totalMembers) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="mt-6 flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Collection Rate</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {invoices.length
                  ? Math.round(
                      (invoices.filter((i) => i.status === 'paid').length / invoices.length) * 100,
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${
                    invoices.length
                      ? (invoices.filter((i) => i.status === 'paid').length / invoices.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
