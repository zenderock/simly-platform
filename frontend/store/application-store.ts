import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Application } from "@/types";

interface ApplicationState {
  applications: Application[];
  activeAppId: number | null;
  setApplications: (apps: Application[]) => void;
  setActiveAppId: (id: number | null) => void;
  getActiveApp: () => Application | null;
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: [],
      activeAppId: null,
      setApplications: (apps) => {
        const { activeAppId } = get();
        // If no active app or current active app is not in the new list, 
        // and there is at least one app, select the first one.
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
      }
    }),
    {
      name: "simly-application-storage",
    }
  )
);
