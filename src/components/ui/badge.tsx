import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-slate-100 text-slate-700 ring-slate-200",
        info: "bg-blue-50 text-blue-800 ring-blue-200",
        success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        warning: "bg-amber-50 text-amber-900 ring-amber-200",
        danger: "bg-rose-50 text-rose-800 ring-rose-200",
        dark: "bg-slate-700 text-white ring-slate-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
