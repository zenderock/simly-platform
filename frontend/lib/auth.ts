
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
}

interface Organization {
  id: number;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  organizationId: number | null;
  organizations: Organization[];
  setAuth: (token: string, user: User) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setOrganizationId: (id: number) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      organizationId: null,
      organizations: [],
      setAuth: (token, user) => set({ token, user }),
      setOrganizations: (organizations) => {
        set({ organizations });
        // Set default org if not selected and list not empty
        const { organizationId } = useAuth.getState();
        if (!organizationId && organizations.length > 0) {
          set({ organizationId: organizations[0].id });
        }
      },
      setOrganizationId: (id) => set({ organizationId: id }),
      logout: () => set({ token: null, user: null, organizationId: null, organizations: [] }),
    }),
    {
      name: 'simly-auth-storage',
    }
  )
);
