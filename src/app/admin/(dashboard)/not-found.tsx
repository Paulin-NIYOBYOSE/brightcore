import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Record not found"
      description="This job or application doesn't exist. It may have been removed, or the link may be wrong."
      action={
        <Link href="/admin" className={buttonVariants({ variant: "secondary" })}>
          Back to dashboard
        </Link>
      }
    />
  );
}
