import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function JobNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={SearchX}
        title="We couldn't find this job"
        description="The link may be incorrect, or the role may no longer be listed."
        action={
          <Link href="/#open-roles" className={buttonVariants()}>
            See open roles
          </Link>
        }
      />
    </div>
  );
}
