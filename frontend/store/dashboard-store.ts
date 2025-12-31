import { create } from "zustand";

interface DashboardState {
  searchQuery: string;
  statusFilter: string;
  appFilter: string;
  deviceFilter: string;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  setAppFilter: (filter: string) => void;
  setDeviceFilter: (filter: string) => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  searchQuery: "",
  statusFilter: "all",
  appFilter: "all",
  deviceFilter: "all",
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setAppFilter: (filter) => set({ appFilter: filter }),
  setDeviceFilter: (filter) => set({ deviceFilter: filter }),
  clearFilters: () =>
    set({
      searchQuery: "",
      statusFilter: "all",
      appFilter: "all",
      deviceFilter: "all",
    }),
}));
