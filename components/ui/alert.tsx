import { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant =
  | "success"
  | "error"
  | "warning"
  | "info";

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

const variants = {
  success: {
    container: "border-green-200 bg-green-50 text-green-800",
    icon: CheckCircle2,
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800",
    icon: XCircle,
  },
  warning: {
    container: "border-yellow-200 bg-yellow-50 text-yellow-800",
    icon: AlertTriangle,
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-800",
    icon: Info,
  },
};

export default function Alert({
  variant = "info",
  children,
  className,
}: AlertProps) {
  const { container, icon: Icon } = variants[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        container,
        className
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />

      <div className="text-sm font-medium">
        {children}
      </div>
    </div>
  );
}