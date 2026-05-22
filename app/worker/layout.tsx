import { AuthGuard } from "@/components/auth-guard";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard role="worker">{children}</AuthGuard>;
}
