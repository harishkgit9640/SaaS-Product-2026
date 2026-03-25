import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceStore } from '@/stores';
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
import type { Invoice } from '@/types';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/format';

const statusColor = (s: string) => getStatusColor(s) as 'green' | 'yellow' | 'red' | 'gray';

export default function MemberInvoicesPage() {
  const navigate = useNavigate();
  const { invoices, isLoading, error, fetchInvoices } = useInvoiceStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (search) {
      result = result.filter((i) =>
        i.invoiceNumber.toLowerCase().includes(search.toLowerCase()),
      );
    }
    return result;
  }, [invoices, search, statusFilter]);

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice #',
      render: (i) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">{i.invoiceNumber}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (i) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(i.amountCents)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (i) => <span className="text-gray-500 dark:text-gray-400">{formatDate(i.dueDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => (
        <Badge color={statusColor(i.status)}>
          {i.status.charAt(0).toUpperCase() + i.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: (i) =>
        i.status !== 'paid' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/member/payments?invoiceId=${i.id}`);
            }}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Pay Now
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/member/receipt/${i.id}`);
            }}
            className="text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Receipt
          </button>
        ),
    },
  ];

  if (isLoading && invoices.length === 0) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchInvoices} />;

  return (
    <div>
      <PageHeader title="My Invoices" description={`${invoices.length} total invoices`} />

      <Card padding={false}>
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row dark:border-gray-800">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No invoices found" description="You have no invoices yet" />
        ) : (
          <Table columns={columns} data={filtered} keyExtractor={(i) => i.id} />
        )}
      </Card>
    </div>
  );
}
