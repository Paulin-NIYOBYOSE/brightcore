import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold text-blue-700">404</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
          <p className="mt-3 text-slate-600">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
          </p>
          <Link href="/" className={buttonVariants({ className: "mt-6" })}>
            See open roles
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
