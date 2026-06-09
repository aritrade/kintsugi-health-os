"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardCheck, Search, FolderOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { href: "/investigate", label: "Investigate", icon: Search },
  { href: "/records", label: "Records", icon: FolderOpen },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card print:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
