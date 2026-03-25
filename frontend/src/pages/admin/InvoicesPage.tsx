import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { HiPlus } from 'react-icons/hi2';
import { useInvoiceStore, useMemberStore } from '@/stores';
import {
  PageHeader,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  SearchInput,
  LoadingScreen,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import type { Invoice, CreateInvoiceInput } from '@/types';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/format';

const statusColor = (s: string) => getStatusColor(s) as 'green' | 'yellow' | 'red' | 'gray';

export default function InvoicesPage() {
  const { invoices, isLoading, error, fetchInvoices, createInvoice } = useInvoiceStore();
  const { members, fetchMembers } = useMemberStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateInvoiceInput>({
    memberId: '',
    invoiceNumber: '',
    amountCents: 0,
    dueDate: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchMembers();
  }, [fetchInvoices, fetchMembers]);

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

  const openCreate = () => {
    setForm({
      memberId: members[0]?.id || '',
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      amountCents: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createInvoice(form);
      toast.success('Invoice created');
      setModalOpen(false);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m.fullName])),
    [members],
  );

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice #',
      render: (i) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">{i.invoiceNumber}</span>
      ),
    },
    {
      key: 'member',
      header: 'Member',
      render: (i) => (
        <span className="text-gray-600 dark:text-gray-400">
          {memberMap.get(i.memberId) || i.memberId.slice(0, 8)}
        </span>
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
      key: 'issued',
      header: 'Issued',
      render: (i) => <span className="text-gray-500 dark:text-gray-400">{formatDate(i.issuedAt)}</span>,
    },
  ];

  if (isLoading && invoices.length === 0) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchInvoices} />;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`${invoices.length} total invoices`}
        action={
          <Button leftIcon={<HiPlus className="h-4 w-4" />} onClick={openCreate}>
            Create Invoice
          </Button>
        }
      />

      <Card padding={false}>
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row dark:border-gray-800">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by invoice number..." />
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
          <EmptyState
            title="No invoices found"
            description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first invoice'}
          />
        ) : (
          <Table columns={columns} data={filtered} keyExtractor={(i) => i.id} />
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Invoice">
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Member"
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            options={members.map((m) => ({ value: m.id, label: m.fullName }))}
            placeholder="Select a member"
          />
          <Input
            label="Invoice Number"
            value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            required
          />
          <Input
            label="Amount (in paise / cents)"
            type="number"
            value={String(form.amountCents)}
            onChange={(e) => setForm({ ...form, amountCents: Number(e.target.value) })}
            helperText={`Display: ${formatCurrency(form.amountCents)}`}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
