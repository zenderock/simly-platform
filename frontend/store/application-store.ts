import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Application } from "@/types";

import api from "@/lib/api";

interface ApplicationState {
  applications: Application[];
  activeAppId: number | null;
  setApplications: (apps: Application[]) => void;
  setActiveAppId: (id: number | null) => void;
  getActiveApp: () => Application | null;
  fetchApplications: () => Promise<void>;
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: [],
      activeAppId: null,
      setApplications: (apps) => {
        const { activeAppId } = get();
        let newActiveId = activeAppId;
        if (apps.length > 0) {
          if (!activeAppId || !apps.find(a => a.id === activeAppId)) {
            newActiveId = apps[0].id;
          }
        } else {
          newActiveId = null;
        }
        set({ applications: apps, activeAppId: newActiveId });
      },
      setActiveAppId: (id) => set({ activeAppId: id }),
      getActiveApp: () => {
        const { applications, activeAppId } = get();
        return applications.find(a => a.id === activeAppId) || null;
      },
      fetchApplications: async () => {
        try {
          const response = await api.get<Application[]>("/applications");
          get().setApplications(response.data);
        } catch (error) {
          console.error("Failed to fetch applications:", error);
        }
      },
    }),
    {
      name: "simly-application-storage",
    }
  )
);
