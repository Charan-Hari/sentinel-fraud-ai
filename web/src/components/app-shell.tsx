"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  LayoutDashboard,
  SearchCheck,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/ingest", label: "Upload data", icon: Database },
  { href: "/investigations", label: "Investigate", icon: SearchCheck },
  { href: "/governance", label: "Governance", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle =
    pathname === "/"
      ? "Fraud risk overview"
      : pathname === "/ingest"
        ? "Upload transaction data"
        : pathname === "/investigations"
          ? "Investigation workspace"
          : "Model governance";

  return (
    <div
      className="min-h-screen bg-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(34, 211, 238, 0.20), transparent 30%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.15), transparent 26%)",
      }}
    >
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:px-8">
          <Link className="flex shrink-0 items-center gap-2.5" href="/">
            <div className="rounded-xl bg-slate-950 p-2 text-cyan-300 shadow-lg shadow-slate-400/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold tracking-tight text-slate-950">Sentinel</p>
              <p className="text-[11px] text-slate-500">{pageTitle}</p>
            </div>
          </Link>

          <nav aria-label="Primary navigation" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 lg:block">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Model online
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-8 border-t border-slate-200 bg-white/70 px-5 py-6 text-center text-xs text-slate-500">
        Sentinel uses synthetic data for educational demonstration. Human review is required.
      </footer>
    </div>
  );
}
