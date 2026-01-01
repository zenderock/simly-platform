import { cn } from "@/lib/utils";

export default function LoaderQuater({ className }: { className?: string }) {
    return (
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={cn("icon icon-tabler icons-tabler-outline icon-tabler-loader-quarter animate-spin", className)}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 6l0 -3" /><path d="M6 12l-3 0" /><path d="M7.75 7.75l-2.15 -2.15" /></svg>
    )
}