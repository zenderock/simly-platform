
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Organization } from '@/types';
import api from './api';

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  organizationId: number | null;
  organizations: Organization[];
  setAuth: (token: string, user: User) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setOrganizationId: (id: number) => void;
  refreshOrganizations: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organizationId: null,
      organizations: [],
      setAuth: (token, user) => set({ token, user }),
      setOrganizations: (organizations) => {
        set({ organizations });
        // Set default org if not selected and list not empty
        const { organizationId } = get();
        if (!organizationId && organizations.length > 0) {
          set({ organizationId: organizations[0].id });
        }
      },
      setOrganizationId: (id) => set({ organizationId: id }),
      refreshOrganizations: async () => {
        try {
          const response = await api.get<Organization[]>('/organizations');
          set({ organizations: response.data });
        } catch (error) {
          console.error('Failed to refresh organizations:', error);
        }
      },
      logout: () => set({ token: null, user: null, organizationId: null, organizations: [] }),
    }),
    {
      name: 'simly-auth-storage',
    }
  )
);
