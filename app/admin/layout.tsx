"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/roster", label: "Roster" },
  { href: "/admin/log", label: "Celebration log" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden>🎉</span> Kudos
            </span>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    pathname === item.href && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={logout}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
