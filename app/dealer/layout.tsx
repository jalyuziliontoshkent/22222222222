import { AuthGuard } from "@/components/auth-guard";

export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard role="dealer">{children}</AuthGuard>;
}
