import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-navy-900 text-white shadow-sm hover:bg-navy-800",
        secondary: "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        success: "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800",
        danger: "bg-rose-700 text-white shadow-sm hover:bg-rose-800",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, disables the button and sets aria-busy. */
    pending?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  pending = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
