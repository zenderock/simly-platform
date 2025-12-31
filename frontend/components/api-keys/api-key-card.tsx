"use client";

import { APIKey } from "@/types";
import { 
  Key, 
  Copy, 
  Trash2, 
  Calendar, 
  Clock, 
  Check, 
  MoreVertical,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface APIKeyCardProps {
  apiKey: APIKey;
  isSandbox?: boolean;
  onRevoke: (id: number) => void;
}

export function APIKeyCard({ apiKey, isSandbox, onRevoke }: APIKeyCardProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "API Key prefix has been copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className={`group relative flex items-center justify-between p-4 rounded-xl border bg-card transition-all hover:border-[#6e3ff3]/30 ${isSandbox ? "border-dashed border-orange-200" : ""}`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${isSandbox ? "bg-orange-50 text-orange-600" : "bg-primary/10 text-primary"}`}>
          {isSandbox ? <ShieldAlert className="size-5" /> : <Key className="size-5" />}
        </div>
        
        <div className="flex flex-col min-w-0">
           <div className="flex items-center gap-2">
             <span className="font-bold text-sm truncate">{apiKey.name}</span>
             {isSandbox && (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] h-4 py-0 px-1 font-bold">
                  SANDBOX
                </Badge>
             )}
           </div>
           <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
             <div className="flex items-center gap-1 font-mono tracking-tighter bg-secondary/20 px-1.5 rounded py-0.5">
               <span>{apiKey.prefix}</span>
               <span>••••••••••••••••</span>
               <button 
                  onClick={() => handleCopy(apiKey.prefix)}
                  className="ml-1 text-primary hover:text-primary/80"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
               </button>
             </div>
             <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>Last used: {formatDate(apiKey.last_used_at)}</span>
             </div>
           </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
           <DropdownMenuItem 
             className="text-destructive font-bold gap-2"
             onClick={() => onRevoke(apiKey.id)}
           >
             <Trash2 className="size-4" />
             Revoke Key
           </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
