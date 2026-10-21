"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="This page couldn't be loaded"
      description={
        <>
          Something went wrong on the server. Please try again.
          {error.digest && <span className="mt-1 block text-xs">Reference: {error.digest}</span>}
        </>
      }
      action={
        <Button onClick={() => retry()}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      }
    />
  );
}
