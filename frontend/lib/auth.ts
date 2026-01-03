
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Organization } from '@/types';
import { queryClient } from '@/lib/react-query';
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
  setAuth: (token: string, user: User, organizations?: Organization[]) => void;
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
      setAuth: (token, user, organizations) => {
        const newState: Partial<AuthState> = { token, user };
        if (organizations) {
            newState.organizations = organizations;
            if (organizations.length > 0) {
                newState.organizationId = organizations[0].id;
            }
        }
        set(newState);
      },
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
      logout: () => {
        set({ token: null, user: null, organizationId: null, organizations: [] });
        queryClient.removeQueries();
      },
    }),
    {
      name: 'simly-auth-storage',
    }
  )
);
