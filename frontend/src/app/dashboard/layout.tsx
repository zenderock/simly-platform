import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 sm:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
