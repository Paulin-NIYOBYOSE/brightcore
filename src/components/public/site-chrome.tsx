import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="BrightCore Careers home">
          <Logo />
        </Link>
        <nav aria-label="Main">
          <Link
            href="/#open-roles"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-navy-900"
          >
            Open roles
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} BrightCore. Building dependable technology across East
          Africa.
        </p>
        <Link href="/admin/login" className="font-medium text-slate-700 hover:text-navy-900">
          Recruiter sign in
        </Link>
      </div>
    </footer>
  );
}
