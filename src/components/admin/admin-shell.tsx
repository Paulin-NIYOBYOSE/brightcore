import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/admin/auth-actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";

function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-navy-200 hover:bg-white/5 hover:text-white"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Sign out</span>
      </button>
    </form>
  );
}

export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Desktop sidebar: the navy column spans the full page; its content stays in view. */}
      <aside className="hidden bg-navy-950 lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-4 py-5">
          <Link href="/admin" className="rounded-md px-2" aria-label="BrightCore Careers admin">
            <Logo inverted />
          </Link>
          <p className="mt-1 px-2 text-xs font-medium tracking-wide text-navy-300 uppercase">
            Recruitment admin
          </p>
          <div className="mt-8 flex-1">
            <AdminNav orientation="vertical" />
          </div>
          <div className="space-y-1 border-t border-white/10 pt-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-navy-200 hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              View careers site
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
            <p className="truncate px-3 pt-2 text-xs text-navy-300" title={adminEmail}>
              Signed in as {adminEmail}
            </p>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile and tablet header */}
      <header className="bg-navy-950 px-4 pt-3 pb-2 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="rounded-md" aria-label="BrightCore Careers admin">
            <Logo inverted />
          </Link>
          <SignOutButton compact />
        </div>
        <div className="mt-3">
          <AdminNav orientation="horizontal" />
        </div>
      </header>

      <main id="main-content" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <div className="mt-1 text-sm text-slate-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
