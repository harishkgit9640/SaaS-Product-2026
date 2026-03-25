import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiPencilSquare, HiTrash } from 'react-icons/hi2';
import { useMemberStore } from '@/stores';
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
import type { Member, CreateMemberInput } from '@/types';
import { formatDate, getStatusColor } from '@/utils/format';

const statusColor = (s: string) => getStatusColor(s) as 'green' | 'yellow' | 'red' | 'gray';

export default function MembersPage() {
  const { members, isLoading, error, fetchMembers, createMember, updateMember, deleteMember } =
    useMemberStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateMemberInput>({ fullName: '', email: '', status: 'active' });

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [members, search],
  );

  const openCreate = () => {
    setEditingMember(null);
    setForm({ fullName: '', email: '', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setForm({ fullName: member.fullName, email: member.email, status: member.status });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingMember) {
        await updateMember(editingMember.id, form);
        toast.success('Member updated');
      } else {
        await createMember(form);
        toast.success('Member created');
      }
      setModalOpen(false);
    } catch {
      // handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteMember(deleteTarget.id);
      toast.success('Member deleted');
      setDeleteTarget(null);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (m) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{m.fullName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => (
        <Badge color={statusColor(m.status)}>
          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (m) => <span className="text-gray-500 dark:text-gray-400">{formatDate(m.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (m) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(m); }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <HiPencilSquare className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <HiTrash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading && members.length === 0) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchMembers} />;

  return (
    <div>
      <PageHeader
        title="Members"
        description={`${members.length} total members`}
        action={
          <Button leftIcon={<HiPlus className="h-4 w-4" />} onClick={openCreate}>
            Add Member
          </Button>
        }
      />

      <Card padding={false}>
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search members..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No members found"
            description={search ? 'Try a different search term' : 'Add your first member to get started'}
            action={
              !search ? (
                <Button size="sm" onClick={openCreate}>
                  Add Member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table columns={columns} data={filtered} keyExtractor={(m) => m.id} />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Member' : 'New Member'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
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
              {editingMember ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Member"
        message={`Are you sure you want to delete "${deleteTarget?.fullName}"? This action cannot be undone.`}
        isLoading={saving}
      />
    </div>
  );
}
