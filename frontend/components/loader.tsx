import { cn } from "@/lib/utils";
import { IconLoaderQuarter } from "@tabler/icons-react";

export default function LoaderQuater({ className }: { className?: string }) {
    return (
       <IconLoaderQuarter className={cn("animate-spin", className)} />
    )
}