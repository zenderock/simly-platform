"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Overview", href: "/dashboard" },
  { name: "Devices", href: "/dashboard/devices" },
  { name: "Messages", href: "/dashboard/messages" },
  { name: "Settings", href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border min-h-screen p-6 hidden md:block">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-bold">
          S
        </div>
        <span className="font-bold text-lg">Simly</span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-black font-semibold"
                  : "text-gray-500 hover:text-black hover:bg-gray-50"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-10">
         <div className="text-xs text-gray-400 font-mono">v0.1.0-alpha</div>
      </div>
    </aside>
  );
}
