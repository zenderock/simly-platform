"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Organization } from "@/types";

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  detail: (id: number) => [...organizationKeys.all, "detail", id] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: async () => {
      const res = await api.get<Organization[]>("/organizations");
      return res.data || [];
    },
    staleTime: 60000, // Organizations don't change often
  });
}

export function useCurrentOrganization() {
  const { data: organizations, ...rest } = useOrganizations();
  return {
    data: organizations?.[0] || null,
    ...rest,
  };
}
