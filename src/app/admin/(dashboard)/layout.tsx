import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/auth/current-admin";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | BrightCore Careers Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Each page also calls requireAdminPage(): layouts are not re-run on every
  // navigation, so pages must not rely on this check alone.
  const admin = await requireAdminPage();
  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
