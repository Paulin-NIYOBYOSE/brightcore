"use client";

import { BriefcaseBusiness, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness, exact: false },
  { href: "/admin/applications", label: "Applications", icon: Users, exact: false },
];

/** Vertical in the desktop sidebar, a horizontal tab row on small screens. */
export function AdminNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin">
      <ul className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "overflow-x-auto")}>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-navy-200 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
