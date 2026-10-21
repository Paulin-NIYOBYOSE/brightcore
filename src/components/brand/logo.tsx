import { cn } from "@/lib/utils";

/** The BrightCore mark: a bright core with two orbiting arcs. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-navy-900" />
      <path
        d="M16 6.75a9.25 9.25 0 0 1 9.25 9.25"
        fill="none"
        className="stroke-blue-400"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 25.25A9.25 9.25 0 0 1 6.75 16"
        fill="none"
        className="stroke-blue-400"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="4.75" fill="#fff" />
    </svg>
  );
}

/** Mark plus wordmark. `inverted` is for dark (navy) backgrounds. */
export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={inverted ? "rounded-lg ring-1 ring-white/15" : undefined} />
      <span className="flex items-baseline gap-1.5 text-lg leading-none tracking-tight">
        <span className={cn("font-semibold", inverted ? "text-white" : "text-navy-900")}>
          BrightCore
        </span>
        <span className={cn("font-medium", inverted ? "text-blue-300" : "text-blue-700")}>
          Careers
        </span>
      </span>
    </span>
  );
}
