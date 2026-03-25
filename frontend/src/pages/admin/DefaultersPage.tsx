import { useEffect, useMemo, useState } from 'react';
import { useInvoiceStore, useMemberStore } from '@/stores';
import {
  PageHeader,
  Card,
  Table,
  Badge,
  SearchInput,
  LoadingScreen,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';
import { HiExclamationTriangle } from 'react-icons/hi2';

interface DefaulterRow {
  memberId: string;
  memberName: string;
  memberEmail: string;
  overdueCount: number;
  totalOverdueCents: number;
  oldestDueDate: string;
}

export default function DefaultersPage() {
  const { invoices, isLoading: invLoading, error: invError, fetchInvoices } = useInvoiceStore();
  const { members, isLoading: memLoading, fetchMembers } = useMemberStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchMembers();
  }, [fetchInvoices, fetchMembers]);

  const defaulters = useMemo(() => {
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const overdue = invoices.filter((i) => i.status === 'overdue');

    const grouped = new Map<string, DefaulterRow>();
    for (const inv of overdue) {
      const existing = grouped.get(inv.memberId);
      const member = memberMap.get(inv.memberId);
      if (existing) {
        existing.overdueCount++;
        existing.totalOverdueCents += inv.amountCents;
        if (new Date(inv.dueDate) < new Date(existing.oldestDueDate)) {
          existing.oldestDueDate = inv.dueDate;
        }
      } else {
        grouped.set(inv.memberId, {
          memberId: inv.memberId,
          memberName: member?.fullName || 'Unknown',
          memberEmail: member?.email || '',
          overdueCount: 1,
          totalOverdueCents: inv.amountCents,
          oldestDueDate: inv.dueDate,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.totalOverdueCents - a.totalOverdueCents);
  }, [invoices, members]);

  const filtered = useMemo(
    () =>
      defaulters.filter(
        (d) =>
          d.memberName.toLowerCase().includes(search.toLowerCase()) ||
          d.memberEmail.toLowerCase().includes(search.toLowerCase()),
      ),
    [defaulters, search],
  );

  const isLoading = invLoading || memLoading;

  const columns: Column<DefaulterRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (d) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{d.memberName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{d.memberEmail}</p>
        </div>
      ),
    },
    {
      key: 'overdue',
      header: 'Overdue Invoices',
      render: (d) => <Badge color="red">{d.overdueCount} overdue</Badge>,
    },
    {
      key: 'amount',
      header: 'Total Overdue',
      render: (d) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {formatCurrency(d.totalOverdueCents)}
        </span>
      ),
    },
    {
      key: 'oldest',
      header: 'Oldest Due Date',
      render: (d) => (
        <span className="text-gray-500 dark:text-gray-400">{formatDate(d.oldestDueDate)}</span>
      ),
    },
  ];

  if (isLoading && invoices.length === 0) return <LoadingScreen />;
  if (invError) return <ErrorState message={invError} onRetry={fetchInvoices} />;

  return (
    <div>
      <PageHeader
        title="Defaulters"
        description={`${defaulters.length} members with overdue invoices`}
      />

      <Card padding={false}>
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search defaulters..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No defaulters"
            description="All invoices are up to date"
            icon={<HiExclamationTriangle className="h-8 w-8 text-emerald-500" />}
          />
        ) : (
          <Table columns={columns} data={filtered} keyExtractor={(d) => d.memberId} />
        )}
      </Card>
    </div>
  );
}
