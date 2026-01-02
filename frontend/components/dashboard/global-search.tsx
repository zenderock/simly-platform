"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Command, Loader2, MessageSquare, Smartphone, Key, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "message" | "device" | "application" | "api-key";
  title: string;
  subtitle?: string;
  url: string;
}

const typeConfig = {
  message: {
    icon: MessageSquare,
    label: "Messages",
    color: "text-blue-500",
  },
  device: {
    icon: Smartphone,
    label: "Devices",
    color: "text-green-500",
  },
  application: {
    icon: Users,
    label: "Applications",
    color: "text-purple-500",
  },
  "api-key": {
    icon: Key,
    label: "API Keys",
    color: "text-orange-500",
  },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { organizationId } = useAuth();
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Clear everything when closing
      setQuery("");
      setResults([]);
      setLoading(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  };

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !organizationId) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [messagesRes, devicesRes, appsRes, keysRes] = await Promise.allSettled([
        api.get(`/messages?search=${encodeURIComponent(searchQuery)}&limit=3`),
        api.get(`/devices?search=${encodeURIComponent(searchQuery)}&limit=3`),
        api.get(`/applications?search=${encodeURIComponent(searchQuery)}&limit=3`),
        api.get(`/api-keys?search=${encodeURIComponent(searchQuery)}&limit=3`),
      ]);

      const searchResults: SearchResult[] = [];

      // Messages
      if (messagesRes.status === "fulfilled" && messagesRes.value.data) {
        messagesRes.value.data.forEach((msg: any) => {
          searchResults.push({
            id: `message-${msg.id}`,
            type: "message",
            title: `Message to ${msg.to}`,
            subtitle: msg.body.substring(0, 50) + (msg.body.length > 50 ? "..." : ""),
            url: `/messages?id=${msg.id}`,
          });
        });
      }

      // Devices
      if (devicesRes.status === "fulfilled" && devicesRes.value.data) {
        devicesRes.value.data.forEach((device: any) => {
          searchResults.push({
            id: `device-${device.id}`,
            type: "device",
            title: device.name,
            subtitle: `${device.model} - ${device.status}`,
            url: `/devices?id=${device.id}`,
          });
        });
      }

      // Applications
      if (appsRes.status === "fulfilled" && appsRes.value.data) {
        appsRes.value.data.forEach((app: any) => {
          searchResults.push({
            id: `app-${app.id}`,
            type: "application",
            title: app.name,
            subtitle: app.is_sandbox ? "Sandbox" : "Production",
            url: `/applications?id=${app.id}`,
          });
        });
      }

      // API Keys
      if (keysRes.status === "fulfilled" && keysRes.value.data) {
        keysRes.value.data.forEach((key: any) => {
          searchResults.push({
            id: `key-${key.id}`,
            type: "api-key",
            title: key.name,
            subtitle: `${key.prefix}...`,
            url: `/api-keys?id=${key.id}`,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, organizationId, performSearch]);

  const handleSelect = (result: SearchResult) => {
    handleOpenChange(false);
    router.push(result.url);
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Search Input */}
      <div className="hidden md:flex relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search everywhere..."
          className="pl-9 pr-12 h-9 bg-background/50 border shadow-none focus-visible:ring-1 focus-visible:ring-primary w-full cursor-pointer"
          onClick={() => setOpen(true)}
          readOnly
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Command className="size-2.5" />
          <span>K</span>
        </div>
      </div>

      {/* Mobile Search Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Search messages, devices, applications..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
          
          {!loading && query && results.length === 0 && (
            <CommandEmpty>No results found for "{query}"</CommandEmpty>
          )}

          {!loading && Object.entries(groupedResults).map(([type, items]) => {
            const config = typeConfig[type as keyof typeof typeConfig];
            const IconComponent = config.icon;

            return (
              <CommandGroup key={type} heading={config.label}>
                {items.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <IconComponent className={cn("size-4", config.color)} />
                    <div className="flex-1">
                      <div className="font-medium">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-sm text-muted-foreground">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}