"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navByRole } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useAuth } from "@/components/providers";
import type { UserRole } from "@/types/app";

export function AppShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: UserRole;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const theme = useAppStore((state) => state.theme);
  const { user, logout } = useAuth();
  const navigation = navByRole[role];

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="brand-card">
          <span className="brand-kicker">Curtain CRM</span>
          <h2>{user?.name || "Panel"}</h2>
          <p>{user?.email}</p>
        </div>

        <nav className="shell-nav">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-link",
                pathname === item.href && "nav-link-active",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="ghost-button" onClick={toggleTheme}>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
            {theme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}
          </button>
          <button type="button" className="ghost-button" onClick={logout}>
            <span>Exit</span>
            Chiqish
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="page-header">
          <div>
            <span className="page-kicker">{role.toUpperCase()}</span>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="page-actions">{actions}</div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
