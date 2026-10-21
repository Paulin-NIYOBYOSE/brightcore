"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

// Shown when a public page fails to load (for example, the database is down).
// Error details stay on the server; the digest helps match server logs.
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">We couldn&rsquo;t load this page</h1>
      <p className="mt-3 text-slate-600">
        Something went wrong on our side. Please try again in a moment.
      </p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => retry()}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          All open roles
        </Link>
      </div>
    </div>
  );
}
