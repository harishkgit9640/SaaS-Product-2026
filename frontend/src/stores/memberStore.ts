import { create } from 'zustand';
import { membersApi } from '@/api';
import type { Member, CreateMemberInput, UpdateMemberInput } from '@/types';

interface MemberState {
  members: Member[];
  selectedMember: Member | null;
  isLoading: boolean;
  error: string | null;

  fetchMembers: () => Promise<void>;
  fetchMember: (id: string) => Promise<void>;
  createMember: (data: CreateMemberInput) => Promise<Member>;
  updateMember: (id: string, data: UpdateMemberInput) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  clearSelection: () => void;
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  selectedMember: null,
  isLoading: false,
  error: null,

  fetchMembers: async () => {
    set({ isLoading: true, error: null });
    try {
      const members = await membersApi.list();
      set({ members, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch members', isLoading: false });
    }
  },

  fetchMember: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const member = await membersApi.getById(id);
      set({ selectedMember: member, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch member', isLoading: false });
    }
  },

  createMember: async (data) => {
    const member = await membersApi.create(data);
    set({ members: [...get().members, member] });
    return member;
  },

  updateMember: async (id, data) => {
    const updated = await membersApi.update(id, data);
    set({
      members: get().members.map((m) => (m.id === id ? updated : m)),
      selectedMember: get().selectedMember?.id === id ? updated : get().selectedMember,
    });
  },

  deleteMember: async (id) => {
    await membersApi.remove(id);
    set({
      members: get().members.filter((m) => m.id !== id),
      selectedMember: get().selectedMember?.id === id ? null : get().selectedMember,
    });
  },

  clearSelection: () => set({ selectedMember: null }),
}));
