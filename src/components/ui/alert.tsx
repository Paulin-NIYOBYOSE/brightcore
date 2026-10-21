import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { icon: Info, className: "border-blue-200 bg-blue-50 text-blue-900" },
  success: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  warning: { icon: AlertTriangle, className: "border-amber-200 bg-amber-50 text-amber-950" },
  error: { icon: AlertCircle, className: "border-rose-200 bg-rose-50 text-rose-900" },
};

type AlertProps = {
  tone?: keyof typeof tones;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
} & Pick<React.ComponentProps<"div">, "id" | "tabIndex" | "ref">;

/** Errors are announced immediately (role="alert"); everything else politely (role="status"). */
export function Alert({ tone = "info", title, children, className, ...props }: AlertProps) {
  const { icon: Icon, className: toneClass } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", toneClass, className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-6">{children}</div>}
      </div>
    </div>
  );
}
