import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiPencilSquare, HiTrash } from 'react-icons/hi2';
import { usePlanStore } from '@/stores';
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
  ConfirmDialog,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import type { Plan, CreatePlanInput } from '@/types';
import { formatCurrency, getStatusColor } from '@/utils/format';

const statusColor = (s: string) => getStatusColor(s) as 'green' | 'yellow' | 'red' | 'gray';

export default function PlansPage() {
  const { plans, isLoading, error, fetchPlans, createPlan, updatePlan, deletePlan } = usePlanStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreatePlanInput>({
    name: '',
    amountCents: 0,
    billingCycle: 'monthly',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filtered = useMemo(
    () => plans.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [plans, search],
  );

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ name: '', amountCents: 0, billingCycle: 'monthly', description: '', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      amountCents: plan.amountCents,
      billingCycle: plan.billingCycle,
      description: plan.description || '',
      status: plan.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, form);
        toast.success('Plan updated');
      } else {
        await createPlan(form);
        toast.success('Plan created');
      }
      setModalOpen(false);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deletePlan(deleteTarget.id);
      toast.success('Plan deleted');
      setDeleteTarget(null);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Plan>[] = [
    {
      key: 'name',
      header: 'Plan',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
          {p.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Price',
      render: (p) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(p.amountCents)}
        </span>
      ),
    },
    {
      key: 'cycle',
      header: 'Cycle',
      render: (p) => (
        <span className="text-gray-500 capitalize dark:text-gray-400">{p.billingCycle}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge color={statusColor(p.status)}>
          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(p); }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <HiPencilSquare className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <HiTrash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading && plans.length === 0) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchPlans} />;

  return (
    <div>
      <PageHeader
        title="Plans"
        description={`${plans.length} total plans`}
        action={
          <Button leftIcon={<HiPlus className="h-4 w-4" />} onClick={openCreate}>
            Add Plan
          </Button>
        }
      />

      <Card padding={false}>
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search plans..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No plans found"
            description={search ? 'Try a different search term' : 'Create your first plan'}
            action={!search ? <Button size="sm" onClick={openCreate}>Add Plan</Button> : undefined}
          />
        ) : (
          <Table columns={columns} data={filtered} keyExtractor={(p) => p.id} />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? 'Edit Plan' : 'New Plan'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Plan Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          <Select
            label="Billing Cycle"
            value={form.billingCycle}
            onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
              { value: 'one-time', label: 'One-time' },
            ]}
          />
          <Input
            label="Description"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status || 'active'}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingPlan ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Plan"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={saving}
      />
    </div>
  );
}
