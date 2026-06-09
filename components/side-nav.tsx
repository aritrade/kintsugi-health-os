"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  Search,
  FolderOpen,
  FileText,
  Briefcase,
  Boxes,
  Sparkles,
  Share2,
  Activity,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { href: "/investigate", label: "Investigate", icon: Search },
  { href: "/records", label: "Records", icon: FolderOpen },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/cases", label: "Cases", icon: Briefcase },
  { href: "/explore", label: "Explore Packs", icon: Boxes },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/graph", label: "Knowledge Graph", icon: Share2 },
  { href: "/integrations", label: "Integrations", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card md:flex print:hidden">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          Kintsugi
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
