"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { roleRoutes } from "@/lib/constants";
import { useAuth } from "@/components/providers";
import type { UserRole } from "@/types/app";

export function AuthGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.role !== role) {
      router.replace(roleRoutes[user.role]);
      return;
    }
  }, [ready, user, role, router, pathname]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return <>{children}</>;
}
