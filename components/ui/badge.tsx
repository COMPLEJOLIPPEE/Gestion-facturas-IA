import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "secondary";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success:
    "bg-green-100 text-green-800 border-green-200",

  danger:
    "bg-red-100 text-red-800 border-red-200",

  warning:
    "bg-yellow-100 text-yellow-800 border-yellow-200",

  info:
    "bg-blue-100 text-blue-800 border-blue-200",

  secondary:
    "bg-gray-100 text-gray-800 border-gray-200",
};

export default function Badge({
  variant = "secondary",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}