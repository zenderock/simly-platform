import { create } from "zustand";

interface DashboardState {
  searchQuery: string;
  statusFilter: string;
  directionFilter: string;
  appFilter: string;
  deviceFilter: string;
  refreshKey: number;
  triggerRefresh: () => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  setDirectionFilter: (filter: string) => void;
  setAppFilter: (filter: string) => void;
  setDeviceFilter: (filter: string) => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  searchQuery: "",
  statusFilter: "all",
  directionFilter: "all",
  appFilter: "all",
  deviceFilter: "all",
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setDirectionFilter: (filter) => set({ directionFilter: filter }),
  setAppFilter: (filter) => set({ appFilter: filter }),
  setDeviceFilter: (filter) => set({ deviceFilter: filter }),
  clearFilters: () =>
    set({
      searchQuery: "",
      statusFilter: "all",
      directionFilter: "all",
      appFilter: "all",
      deviceFilter: "all",
    }),
}));
